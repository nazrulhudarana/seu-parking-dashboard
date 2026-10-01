#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>
#include <FirebaseESP32.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ==== BLE CREDENTIALS & UUIDs ====
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
BLECharacteristic *pCharacteristic;

// ==== FIREBASE CREDENTIALS ====
#define FIREBASE_HOST "seu-parking-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "ztRKzrHSvVerL5DtTclKn06qpIuI3iDxQbyvuuoD"

// ==== VERCEL BACKEND API URL ====
const char* serverApiUrl = "https://seu-parking-dashboard.vercel.app/api/parking/notify";

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 21600; 
const int   daylightOffset_sec = 0;

LiquidCrystal_I2C lcd(0x27, 16, 2);
#define SS_PIN  5
#define RST_PIN 4
MFRC522 rfid(SS_PIN, RST_PIN);

Servo gateServo;
#define SERVO_PIN 13 

#define S1_TRIG 14
#define S1_ECHO 34
#define S2_TRIG 16
#define S2_ECHO 35
#define S3_TRIG 32
#define S3_ECHO 33

// Traffic Light & Buzzer Pins
#define GREEN_LED 25
#define RED_LED 26
#define YELLOW_LED 15
#define BUZZER 27
#define EMERGENCY_SWITCH_PIN 12 

int availableSlots = 3; 
int lastS1 = -1, lastS2 = -1, lastS3 = -1;
int lastSentD1 = -999, lastSentD2 = -999, lastSentD3 = -999;
int lastAvailable = -1;

bool s1_physically_blocked = false;
bool s2_physically_blocked = false;
bool s3_physically_blocked = false;

unsigned long lastHeartbeatTime = 0;
const long heartbeatInterval = 10000; 
unsigned long lastSensorReadTime = 0;
String pendingUID = "";

bool newConfigRequested = false;
String requestedSsid = "";
String requestedPass = "";

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
        String receivedData = pChar->getValue();
        if (receivedData.length() > 0) {
            int separatorIndex = receivedData.indexOf(':');
            if (separatorIndex != -1) {
                requestedSsid = receivedData.substring(0, separatorIndex);
                requestedPass = receivedData.substring(separatorIndex + 1);
                newConfigRequested = true; 
            }
        }
    }
};

void setupBLE() {
    BLEDevice::init("SEU_Parking_BT");
    BLEServer *pServer = BLEDevice::createServer();
    BLEService *pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ |
                        BLECharacteristic::PROPERTY_WRITE |
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
    pCharacteristic->setCallbacks(new MyCallbacks());
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    BLEDevice::startAdvertising();
}

void setup() {
  Serial.begin(115200); 
  Wire.begin(21, 22); 
  
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Starting System");

  setupBLE();
  
  lcd.setCursor(0, 1);
  lcd.print("Trying MUNJIR..");
  WiFi.begin("MUNJIR", "miqdad@2017");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 8) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("MUNJIR Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Trying Rana..");
    WiFi.begin("Rana", "44444444");
    attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 8) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
  }
  
  if(WiFi.status() == WL_CONNECTED){
    lcd.clear();
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(1500);
    
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer); 
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Syncing Time...");
    
    struct tm timeinfo;
    int retry = 0;
    while (!getLocalTime(&timeinfo) && retry < 20) {
      delay(500);
      retry++;
    }

    lcd.clear();
    if (retry < 20) lcd.print("Time Synced!    ");
    else lcd.print("Time Sync Failed");
    delay(1000);
    
    config.host = FIREBASE_HOST;
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    Firebase.setString(fbdo, "/System/Status", "Online");
    Firebase.setBool(fbdo, "/ParkingSlots/Slot1/sensorConnected", true);
    Firebase.setBool(fbdo, "/ParkingSlots/Slot2/sensorConnected", true);
    Firebase.setBool(fbdo, "/ParkingSlots/Slot3/sensorConnected", true);
  } else {
    lcd.clear();
    lcd.print("No WiFi Found!");
    lcd.setCursor(0, 1);
    lcd.print("Use BT to Setup");
  }
  
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max); 
  
  gateServo.attach(SERVO_PIN);
  gateServo.write(0); 
  
  pinMode(S1_TRIG, OUTPUT); pinMode(S1_ECHO, INPUT);
  pinMode(S2_TRIG, OUTPUT); pinMode(S2_ECHO, INPUT);
  pinMode(S3_TRIG, OUTPUT); pinMode(S3_ECHO, INPUT);
  
  pinMode(GREEN_LED, OUTPUT); 
  pinMode(RED_LED, OUTPUT); 
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(EMERGENCY_SWITCH_PIN, INPUT_PULLUP);
  
  digitalWrite(GREEN_LED, LOW); 
  digitalWrite(YELLOW_LED, LOW); 
  digitalWrite(RED_LED, HIGH); 
  digitalWrite(BUZZER, LOW);
  
  delay(1000);
  lcd.clear();
}

String getCurrentTime() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) return "12:00:00 AM";
  char timeStringBuff[50];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%I:%M:%S %p", &timeinfo);
  return String(timeStringBuff);
}

int getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10); digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 20000); 
  if(duration == 0) return 999; 
  return duration * 0.034 / 2;
}

void triggerGateAccess() {
  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, HIGH); 
  digitalWrite(BUZZER, HIGH);
  delay(150); 
  digitalWrite(BUZZER, LOW); 

  int openDurationSeconds = 3; 
  if (WiFi.status() == WL_CONNECTED) {
    if (Firebase.getInt(fbdo, "/HardwareConfig/gateOpenDuration")) {
      int fetchedDuration = fbdo.intData();
      if (fetchedDuration > 0) {
        openDurationSeconds = fetchedDuration;
      }
    }
  }

  gateServo.write(90); 
  delay(openDurationSeconds * 1000); 
  gateServo.write(0);  
  
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, HIGH); 
}

void triggerAccessDenied() {
  digitalWrite(RED_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, HIGH); 
  digitalWrite(BUZZER, HIGH);
  delay(1000); 
  digitalWrite(BUZZER, LOW);
}

void pushSensorDataToFirebase(int s1, int s2, int s3, int d1, int d2, int d3) {
  if (WiFi.status() != WL_CONNECTED) return;
  if(s1 != lastS1) { Firebase.setInt(fbdo, "/ParkingSlots/Slot1/status", s1); lastS1 = s1; }
  if(s2 != lastS2) { Firebase.setInt(fbdo, "/ParkingSlots/Slot2/status", s2); lastS2 = s2; }
  if(s3 != lastS3) { Firebase.setInt(fbdo, "/ParkingSlots/Slot3/status", s3); lastS3 = s3; }
  if(abs(d1 - lastSentD1) >= 3) { Firebase.setInt(fbdo, "/ParkingSlots/Slot1/distance", d1); lastSentD1 = d1; }
  if(abs(d2 - lastSentD2) >= 3) { Firebase.setInt(fbdo, "/ParkingSlots/Slot2/distance", d2); lastSentD2 = d2; }
  if(abs(d3 - lastSentD3) >= 3) { Firebase.setInt(fbdo, "/ParkingSlots/Slot3/distance", d3); lastSentD3 = d3; }
  Firebase.setInt(fbdo, "/System/AvailableSlots", availableSlots);
}

int timeToMinutes(String timeStr) {
  timeStr.trim();
  int colonIndex = timeStr.indexOf(':');
  if (colonIndex == -1) return 0;
  
  int h = timeStr.substring(0, colonIndex).toInt();
  int m = timeStr.substring(colonIndex + 1, colonIndex + 3).toInt();
  
  bool isPM = (timeStr.indexOf("PM") != -1 || timeStr.indexOf("pm") != -1);
  bool isAM = (timeStr.indexOf("AM") != -1 || timeStr.indexOf("am") != -1);
  
  if (isPM && h < 12) h += 12;
  if (isAM && h == 12) h = 0;
  
  return (h * 60) + m;
}

// Fixed HTTPS Notification using WiFiClientSecure for ESP32 v3.x
void sendEmailNotification(String payload) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure insecureClient;
    insecureClient.setInsecure(); // Bypass SSL certificate verification safely

    HTTPClient http;
    http.begin(insecureClient, serverApiUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(payload);
    Serial.print("HTTP Notification Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected. Cannot send email notification.");
  }
}

void processFirebaseCard(String scannedUID) {
  if (WiFi.status() != WL_CONNECTED) {
    lcd.setCursor(0, 0); lcd.print("WiFi Offline!   ");
    lcd.setCursor(0, 1); lcd.print("Check Network   ");
    triggerAccessDenied();
    return;
  }

  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, HIGH);

  lcd.setCursor(0, 0); lcd.print("Authenticating..");
  lcd.setCursor(0, 1); lcd.print("Please wait...  ");

  String currentTime = getCurrentTime();

  Firebase.getBool(fbdo, "/System/CardRegistrationMode");
  if (fbdo.boolData()) {
    Firebase.setString(fbdo, "/LiveActivity/LastScanUID", scannedUID);
    Firebase.setString(fbdo, "/LiveActivity/ScanTime", currentTime);
    lcd.setCursor(0, 0); lcd.print("Card Captured!  "); 
    lcd.setCursor(0, 1); lcd.print(scannedUID);
    digitalWrite(BUZZER, HIGH); delay(150); digitalWrite(BUZZER, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    return; 
  }

  Firebase.getString(fbdo, "/System/Status");
  if (fbdo.stringData() == "Maintenance") {
    FirebaseJson json;
    json.add("LastScanUID", scannedUID); json.add("ScanTime", currentTime);
    json.add("UserName", "System Locked"); json.add("Slot", 0);
    json.add("AccessStatus", "Denied - Maintenance Mode");
    Firebase.setJSON(fbdo, "/LiveActivity", json);
    lcd.setCursor(0, 0); lcd.print("MAINTENANCE MODE");
    lcd.setCursor(0, 1); lcd.print("Access Denied   ");
    digitalWrite(YELLOW_LED, LOW);
    triggerAccessDenied();
    return; 
  }

  String namePath = "/AuthorizedCards/" + scannedUID + "/name";
  if (Firebase.getString(fbdo, namePath)) {
    String userName = fbdo.stringData();
    if (userName.length() > 0 && userName != "null") {
      
      Firebase.getInt(fbdo, "/Wallets/" + scannedUID + "/balance");
      int walletBalance = fbdo.intData();

      Firebase.getInt(fbdo, "/BillingSettings/minBalanceRequired");
      int minBalance = fbdo.intData();
      if (minBalance <= 0) minBalance = 50;

      String activeSessionPath = "/ActiveSessions/" + scannedUID;
      bool isAlreadyInside = false;
      if (Firebase.get(fbdo, activeSessionPath) && fbdo.jsonString() != "null") {
        isAlreadyInside = true;
      }

      if (!isAlreadyInside) {
        // ==== ENTRY FLOW ====
        if (walletBalance < minBalance) {
          FirebaseJson json;
          json.add("LastScanUID", scannedUID); json.add("ScanTime", currentTime);
          json.add("UserName", userName); json.add("Slot", 0);
          json.add("AccessStatus", "Denied - Low Balance");
          Firebase.setJSON(fbdo, "/LiveActivity", json);
          lcd.setCursor(0, 0); lcd.print("LOW BALANCE!    "); 
          lcd.setCursor(0, 1); lcd.print("Bal: Tk" + String(walletBalance) + "   ");
          digitalWrite(YELLOW_LED, LOW);
          triggerAccessDenied();
          return;
        }

        if (availableSlots > 0) {
          int assignedSlot = 0;
          if (!s1_physically_blocked) assignedSlot = 1;
          else if (!s2_physically_blocked) assignedSlot = 2;
          else if (!s3_physically_blocked) assignedSlot = 3;
          else assignedSlot = 1;

          FirebaseJson sessionJson; 
          sessionJson.add("EntryTime", currentTime); 
          sessionJson.add("AssignedSlot", assignedSlot);
          Firebase.setJSON(fbdo, activeSessionPath, sessionJson);

          time_t now = time(nullptr);
          String logPath = "/Logs/Entry/" + scannedUID + "_" + String(now);
          FirebaseJson logJson; 
          logJson.add("Name", userName); 
          logJson.add("Time", currentTime); 
          logJson.add("AssignedSlot", assignedSlot);
          Firebase.setJSON(fbdo, logPath, logJson);

          FirebaseJson actJson; 
          actJson.add("LastScanUID", scannedUID); 
          actJson.add("ScanTime", currentTime);
          actJson.add("UserName", userName); 
          actJson.add("Slot", assignedSlot); 
          actJson.add("AccessStatus", "Granted - Entry");
          Firebase.setJSON(fbdo, "/LiveActivity", actJson);

          lcd.setCursor(0, 0); lcd.print("IN: " + userName.substring(0, 12)); 
          lcd.setCursor(0, 1); lcd.print("Slot: " + String(assignedSlot) + "       ");
          digitalWrite(YELLOW_LED, LOW);
          triggerGateAccess();

          // TRIGGER ENTRY EMAIL NOTIFICATION
          String emailPayload = "{\"uid\":\"" + scannedUID + "\", \"type\":\"ENTRY\", \"entryTime\":\"" + currentTime + "\", \"slot\":" + String(assignedSlot) + "}";
          sendEmailNotification(emailPayload);

        } else {
          FirebaseJson json; 
          json.add("LastScanUID", scannedUID); 
          json.add("ScanTime", currentTime);
          json.add("UserName", userName); 
          json.add("Slot", 0); 
          json.add("AccessStatus", "Denied - Parking Full");
          Firebase.setJSON(fbdo, "/LiveActivity", json);
          lcd.setCursor(0, 0); lcd.print("Parking FULL!   "); 
          lcd.setCursor(0, 1); lcd.print("Access Denied   ");
          digitalWrite(YELLOW_LED, LOW);
          triggerAccessDenied();
        }
      } else {
        // ==== EXIT FLOW ====
        Firebase.getInt(fbdo, activeSessionPath + "/AssignedSlot");
        int freedSlot = fbdo.intData(); 
        if(freedSlot <= 0) freedSlot = 1;

        Firebase.getString(fbdo, activeSessionPath + "/EntryTime");
        String entryTime = fbdo.stringData();

        Firebase.getInt(fbdo, "/BillingSettings/firstHourRate"); 
        int firstRate = fbdo.intData(); if(firstRate <= 0) firstRate = 30;
        Firebase.getInt(fbdo, "/BillingSettings/additionalHourRate"); 
        int addRate = fbdo.intData(); if(addRate <= 0) addRate = 20;
        Firebase.getInt(fbdo, "/BillingSettings/gracePeriodMins"); 
        int grace = fbdo.intData(); if(grace <= 0) grace = 10;
        Firebase.getInt(fbdo, "/BillingSettings/maxDailyCharge"); 
        int maxCap = fbdo.intData(); if(maxCap <= 0) maxCap = 200;

        int entryMins = timeToMinutes(entryTime);
        int exitMins = timeToMinutes(currentTime);
        int diffMins = exitMins - entryMins;
        if (diffMins < 0) diffMins += 24 * 60;

        int parkingFee = 0;
        if (diffMins <= grace) {
          parkingFee = 0; 
        } else {
          parkingFee = firstRate; 
          if (diffMins > 60) {
            int extraMins = diffMins - 60;
            int extraHours = (extraMins + 59) / 60;
            parkingFee += (extraHours * addRate);
          }
          if (parkingFee > maxCap) parkingFee = maxCap;
        }

        int newBalance = walletBalance - parkingFee;
        
        Firebase.setInt(fbdo, "/Wallets/" + scannedUID + "/balance", newBalance);
        
        int h = diffMins / 60;
        int m = diffMins % 60;
        String durationStr = String(h) + "h " + String(m) + "m";

        time_t now = time(nullptr);
        String receiptId = "PM-" + String(now);

        FirebaseJson receiptJson;
        receiptJson.add("uid", scannedUID);
        receiptJson.add("entryTime", entryTime);
        receiptJson.add("exitTime", currentTime);
        receiptJson.add("fee", parkingFee);
        receiptJson.add("duration", durationStr);
        receiptJson.add("prevBalance", walletBalance);
        receiptJson.add("remainingBalance", newBalance);
        receiptJson.add("status", "PAID");
        Firebase.setJSON(fbdo, "/Receipts/" + receiptId, receiptJson);

        Firebase.deleteNode(fbdo, activeSessionPath);

        String logPath = "/Logs/Exit/" + scannedUID;
        FirebaseJson logJson; 
        logJson.add("Name", userName); 
        logJson.add("ExitTime", currentTime);
        logJson.add("EntryTime", entryTime); 
        logJson.add("FreedSlot", freedSlot);
        Firebase.setJSON(fbdo, logPath, logJson);

        FirebaseJson actJson; 
        actJson.add("LastScanUID", scannedUID); 
        actJson.add("ScanTime", currentTime);
        actJson.add("UserName", userName); 
        actJson.add("Slot", freedSlot); 
        actJson.add("AccessStatus", "Granted - Exit");
        actJson.add("DeductedFee", parkingFee);
        actJson.add("RemainingBalance", newBalance);
        actJson.add("Duration", durationStr);
        Firebase.setJSON(fbdo, "/LiveActivity", actJson);

        lcd.setCursor(0, 0); lcd.print("Fee: Tk" + String(parkingFee) + "   "); 
        lcd.setCursor(0, 1); lcd.print("Bal: Tk" + String(newBalance) + "   ");
        digitalWrite(YELLOW_LED, LOW);
        triggerGateAccess();

        // TRIGGER EXIT BREAKDOWN PDF INVOICE EMAIL
        String exitPayload = "{\"uid\":\"" + scannedUID + "\", \"type\":\"EXIT\", \"entryTime\":\"" + entryTime + "\", \"exitTime\":\"" + currentTime + "\", \"slot\":" + String(freedSlot) + ", \"duration\":\"" + durationStr + "\", \"fee\":" + String(parkingFee) + ", \"remainingBalance\":" + String(newBalance) + "}";
        sendEmailNotification(exitPayload);
      }
    } else {
      FirebaseJson json; 
      json.add("LastScanUID", scannedUID); 
      json.add("ScanTime", currentTime);
      json.add("UserName", "Unauthorized"); 
      json.add("Slot", 0); 
      json.add("AccessStatus", "Denied - Unknown Card");
      Firebase.setJSON(fbdo, "/LiveActivity", json);
      lcd.setCursor(0, 0); lcd.print("Access Denied!  "); 
      lcd.setCursor(0, 1); lcd.print("Unknown Card    ");
      digitalWrite(YELLOW_LED, LOW);
      triggerAccessDenied();
    }
  } else {
    FirebaseJson json; 
    json.add("LastScanUID", scannedUID); 
    json.add("ScanTime", currentTime);
    json.add("UserName", "Unauthorized"); 
    json.add("Slot", 0); 
    json.add("AccessStatus", "Denied - Unknown Card");
    Firebase.setJSON(fbdo, "/LiveActivity", json);
    lcd.setCursor(0, 0); lcd.print("Access Denied!  "); 
    lcd.setCursor(0, 1); lcd.print("Unknown Card    ");
    digitalWrite(YELLOW_LED, LOW);
    triggerAccessDenied();
  }
}

void loop() {
  if (digitalRead(EMERGENCY_SWITCH_PIN) == LOW) {
    digitalWrite(RED_LED, LOW);
    digitalWrite(YELLOW_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
    gateServo.write(90); 
    lcd.setCursor(0, 0); lcd.print("EMERGENCY GATE  "); 
    lcd.setCursor(0, 1); lcd.print("MANUAL OVERRIDE ");
    while (digitalRead(EMERGENCY_SWITCH_PIN) == LOW) { delay(10); }
    gateServo.write(0); 
    digitalWrite(GREEN_LED, LOW); 
    digitalWrite(RED_LED, HIGH); 
    lcd.clear();
    return;
  } else {
    if(digitalRead(GREEN_LED) == LOW && digitalRead(YELLOW_LED) == LOW) {
      digitalWrite(RED_LED, HIGH);
    }
  }

  if (newConfigRequested) {
    newConfigRequested = false;
    lcd.setCursor(0, 0); lcd.print("Connecting WiFi:"); 
    lcd.setCursor(0, 1); lcd.print(requestedSsid.substring(0, 16));
    WiFi.disconnect(true); delay(100); 
    WiFi.begin(requestedSsid.c_str(), requestedPass.c_str());
    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 30) { 
      delay(500); Serial.print("."); timeout++; 
    }

    if (WiFi.status() == WL_CONNECTED) {
      lcd.setCursor(0, 0); lcd.print("WiFi Connected! "); 
      lcd.setCursor(0, 1); lcd.print(WiFi.localIP());
      String response = "SUCCESS:" + WiFi.localIP().toString();
      pCharacteristic->setValue(response.c_str()); pCharacteristic->notify();
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer); 
      config.host = FIREBASE_HOST; config.signer.tokens.legacy_token = FIREBASE_AUTH;
      Firebase.begin(&config, &auth); Firebase.reconnectWiFi(true); 
      Firebase.setString(fbdo, "/System/Status", "Online");
      delay(2000);
    } else {
      lcd.setCursor(0, 0); lcd.print("WiFi Error!     "); 
      lcd.setCursor(0, 1); lcd.print("Check Creds     ");
      String response = "ERROR:Failed to connect SSID";
      pCharacteristic->setValue(response.c_str()); pCharacteristic->notify(); 
      delay(2000);
    }
  }

  if (pendingUID == "" && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String scannedUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) scannedUID += "0";
      scannedUID += String(rfid.uid.uidByte[i], HEX);
    }
    scannedUID.toUpperCase();
    pendingUID = scannedUID; 
    digitalWrite(BUZZER, HIGH); delay(80); digitalWrite(BUZZER, LOW);
    rfid.PICC_HaltA(); rfid.PCD_StopCrypto1();
  }

  if (pendingUID != "") {
    processFirebaseCard(pendingUID);
    pendingUID = ""; 
  }

  unsigned long currentMillis = millis();
  if (pendingUID == "" && currentMillis - lastSensorReadTime >= 1000) {
    lastSensorReadTime = currentMillis;

    int d1 = getDistance(S1_TRIG, S1_ECHO); 
    int d2 = getDistance(S2_TRIG, S2_ECHO); 
    int d3 = getDistance(S3_TRIG, S3_ECHO);
    
    s1_physically_blocked = (d1 > 0 && d1 < 15);
    s2_physically_blocked = (d2 > 0 && d2 < 15);
    s3_physically_blocked = (d3 > 0 && d3 < 15);

    int currentAvailable = 3 - ((s1_physically_blocked ? 1 : 0) + (s2_physically_blocked ? 1 : 0) + (s3_physically_blocked ? 1 : 0));
    availableSlots = currentAvailable;

    String lcdMode = "sensors_free"; 
    if (WiFi.status() == WL_CONNECTED && Firebase.getString(fbdo, "/System/LCDWidgetMode")) {
      String fetchedMode = fbdo.stringData();
      if (fetchedMode.length() > 0 && fetchedMode != "null") lcdMode = fetchedMode;
    }

    char line1[17]; char line2[17];
    if (lcdMode == "clock_free") {
      snprintf(line1, sizeof(line1), "Time: %-8s", getCurrentTime().substring(0, 8).c_str()); 
      snprintf(line2, sizeof(line2), "Free Slots: %-d   ", availableSlots);
    } else if (lcdMode == "only_free") {
      snprintf(line1, sizeof(line1), "SEU Smart Parking"); 
      snprintf(line2, sizeof(line2), "Available: %d/3   ", availableSlots);
    } else if (lcdMode == "scan_message") {
      snprintf(line1, sizeof(line1), "Please Scan Card "); 
      snprintf(line2, sizeof(line2), "Free Slots: %-d   ", availableSlots);
    } else { 
      snprintf(line1, sizeof(line1), "1:%-3d 2:%-3d 3:%-3d", 
               (d1 > 999 ? 999 : d1), (d2 > 999 ? 999 : d2), (d3 > 999 ? 999 : d3)); 
      snprintf(line2, sizeof(line2), "Free Slots: %-d   ", availableSlots);
    }
    lcd.setCursor(0, 0); lcd.print(line1); 
    lcd.setCursor(0, 1); lcd.print(line2);

    bool stateChanged = (currentAvailable != lastAvailable) || 
                        (s1_physically_blocked != (lastS1==1)) || 
                        (s2_physically_blocked != (lastS2==1)) || 
                        (s3_physically_blocked != (lastS3==1));
    bool distChanged = (abs(d1 - lastSentD1) >= 3) || 
                       (abs(d2 - lastSentD2) >= 3) || 
                       (abs(d3 - lastSentD3) >= 3);
    if (stateChanged || distChanged) {
        pushSensorDataToFirebase(s1_physically_blocked ? 1 : 0, s2_physically_blocked ? 1 : 0, s3_physically_blocked ? 1 : 0, d1, d2, d3); 
        lastAvailable = currentAvailable;
    }
  }
  
  if (currentMillis - lastHeartbeatTime >= heartbeatInterval) { 
    lastHeartbeatTime = currentMillis; 
    if (WiFi.status() == WL_CONNECTED) Firebase.setString(fbdo, "/System/Status", "Online"); 
  }
}