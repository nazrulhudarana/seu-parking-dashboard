'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Car, CheckCircle2, XCircle, ArrowRightLeft, ShieldCheck, User, CreditCard, X, Shield, Wrench, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// ==== Top-Down Car Component ====
const TopDownCar = ({ color }: { color: string }) => {
  const getColors = () => {
    const col = (color || '').toLowerCase();
    if (col.includes('red') || col.includes('lal')) return { primary: '#dc2626', dark: '#991b1b', light: '#f87171' };
    if (col.includes('blue') || col.includes('neel')) return { primary: '#2563eb', dark: '#1e40af', light: '#60a5fa' };
    if (col.includes('yellow') || col.includes('holud')) return { primary: '#eab308', dark: '#a16207', light: '#fef08a' };
    if (col.includes('green') || col.includes('shobuj')) return { primary: '#16a34a', dark: '#166534', light: '#4ade80' };
    if (col.includes('black') || col.includes('kalo')) return { primary: '#334155', dark: '#0f172a', light: '#64748b' };
    return { primary: '#f8fafc', dark: '#cbd5e1', light: '#ffffff' };
  };
  const c = getColors();
  const uniqueGradId = `grad-${c.primary.replace('#', '')}`;

  return (
    <svg viewBox="0 0 200 400" className="w-full h-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id={uniqueGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.dark} />
          <stop offset="50%" stopColor={c.light} />
          <stop offset="100%" stopColor={c.primary} />
        </linearGradient>
      </defs>
      <rect x="25" y="25" width="150" height="360" rx="30" fill="rgba(0,0,0,0.5)" filter="blur(4px)" />
      <rect x="20" y="20" width="160" height="360" rx="40" fill={`url(#${uniqueGradId})`} />
      <rect x="35" y="110" width="130" height="170" rx="30" fill="rgba(0,0,0,0.2)" />
      <rect x="40" y="120" width="120" height="150" rx="25" fill={`url(#${uniqueGradId})`} />
      <path d="M40 110 Q100 85 160 110 L150 145 Q100 135 50 145 Z" fill="#020617" />
      <path d="M45 280 Q100 295 155 280 L145 255 Q100 245 55 255 Z" fill="#020617" />
      <rect x="30" y="18" width="35" height="12" rx="4" fill="#fef08a" />
      <rect x="135" y="18" width="35" height="12" rx="4" fill="#fef08a" />
      <rect x="30" y="370" width="40" height="10" rx="4" fill="#ef4444" />
      <rect x="130" y="370" width="40" height="10" rx="4" fill="#ef4444" />
    </svg>
  );
};

// ==== Slot Component ====
const OverlaySlot = ({ num, isOccupied, carColor, distance, position, isHidden, onSlotClick }: { num: string, isOccupied: boolean, carColor: string, distance: number | undefined, position: any, isHidden: boolean, onSlotClick: (slotNum: number) => void }) => {
  const validDist = distance !== undefined ? distance : 15;
  const translateYOffset = isOccupied ? Math.min(10, Math.max(-5, (15 - validDist) * 0.6)) : 0;

  return (
    <div 
      onClick={() => isOccupied && onSlotClick(parseInt(num))}
      className={clsx(
        "absolute flex flex-col items-center justify-end transition-all duration-500 rounded-sm pb-4 group",
        isHidden ? "opacity-0" : "opacity-100",
        isOccupied ? "cursor-pointer hover:scale-105" : "cursor-default"
      )} 
      style={{ ...position }}
    >
      <div className={clsx(
        "absolute inset-0 transition-colors duration-500 z-0 border-x-[4px] border-t-[4px] rounded-t-lg shadow-[0_0_20px_rgba(0,0,0,0.6)]",
        isOccupied ? "bg-rose-500/20 border-rose-500/90 group-hover:bg-rose-500/30" : "bg-emerald-500/10 border-white/90"
      )} />
      <div className="absolute top-2 left-3 font-bold text-lg text-white z-10 font-mono drop-shadow-md">{num}</div>
      
      {distance !== undefined && (
        <div className="absolute top-2 right-2 bg-slate-950/80 border border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300 z-20">
          {distance}cm
        </div>
      )}

      <div className="z-20 w-[72%] h-[82%] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isOccupied ? (
            <motion.div 
              key="car" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1, y: translateYOffset }} 
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              exit={{ opacity: 0 }} 
              className="w-full h-full flex flex-col items-center justify-center relative"
            >
              <div className="rotate-180 w-full h-full"><TopDownCar color={carColor} /></div>
              <span className="absolute -bottom-6 bg-rose-600 border border-rose-400 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg animate-pulse">
                {distance !== undefined ? `${distance}cm` : "OCCUPIED"}
              </span>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col items-center justify-center relative">
              <span className="text-emerald-400/50 font-bold text-4xl font-mono">P</span>
              <span className="absolute -bottom-6 bg-emerald-600 border border-emerald-400 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg">AVAILABLE</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function Home() {
  const [availableSlots, setAvailableSlots] = useState<number>(3);
  const [slotsState, setSlotsState] = useState<Record<string, any>>({});
  const [activeSessions, setActiveSessions] = useState<Record<string, any>>({});
  const [slotColors, setSlotColors] = useState<Record<number, string>>({});
  const [todayEntriesCount, setTodayEntriesCount] = useState<number>(0);

  const [animType, setAnimType] = useState<'entry' | 'exit' | 'denied' | 'maintenance' | null>(null);
  const [animStep, setAnimStep] = useState<number>(0);
  const [animSlot, setAnimSlot] = useState<number>(1);
  const [userName, setUserName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleColour, setVehicleColour] = useState<string>('White');
  const [duration, setDuration] = useState<string>('');
  const [denyReason, setDenyReason] = useState<string>('');
  
  const [userBalance, setUserBalance] = useState<number>(0);
  const [minRequiredBalance, setMinRequiredBalance] = useState<number>(50);

  // লাইভ ফি ও ব্যালেন্স (কার্ড অথেন্টিকেশন বক্সে দেখানোর জন্য)
  const [exitFee, setExitFee] = useState<number>(0);
  const [exitRemainingBal, setExitRemainingBal] = useState<number>(0);

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{
    slotNum: number;
    name: string;
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColour: string;
    entryTime: string;
    uid: string;
  } | null>(null);

  const slotKeys = Object.keys(slotsState).sort((a, b) => {
    const numA = parseInt(a.replace('Slot', '')) || 0;
    const numB = parseInt(b.replace('Slot', '')) || 0;
    return numA - numB;
  });

  const totalSlots = slotKeys.length > 0 ? slotKeys.length : 3;

  let occupiedCount = 0;
  slotKeys.forEach(k => {
    const val = slotsState[k];
    const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
    if (isOcc) occupiedCount++;
  });

  const isFirstLoad = useRef(true);
  const lastScanTime = useRef("");
  const isAnimating = useRef(false);

  const getSlotCoords = (index: number, total: number) => {
    if (total <= 3) {
      const positions = [
        { left: '26%', top: '48%', width: '13%', height: '42%' },
        { left: '43.5%', top: '48%', width: '13%', height: '42%' },
        { left: '61%', top: '48%', width: '13%', height: '42%' }
      ];
      return positions[index] || positions[0];
    } else {
      const isTopSide = index < 5;
      const posInRow = index % 5;
      const step = (82 - 15) / 4;
      return {
        left: `${15 + (posInRow * step)}%`,
        top: isTopSide ? '12%' : '52%',
        width: '8%',
        height: '36%'
      };
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSlotClick = async (slotNum: number) => {
    try {
      const activeSessionsSnap = await get(ref(db, 'ActiveSessions'));
      if (!activeSessionsSnap.exists()) return;

      const sessions = activeSessionsSnap.val();
      let matchedUid = null;
      let sessionData = null;

      for (const uid of Object.keys(sessions)) {
        if (sessions[uid].AssignedSlot === slotNum) {
          matchedUid = uid;
          sessionData = sessions[uid];
          break;
        }
      }

      if (matchedUid && sessionData) {
        const cardSnap = await get(ref(db, `AuthorizedCards/${matchedUid}`));
        const cData = cardSnap.exists() ? cardSnap.val() : {};

        setSelectedSlotDetails({
          slotNum,
          name: cData.name || sessionData.Name || "Authorized User",
          vehicleNumber: cData.vehicleNumber || "Unknown Vehicle",
          vehicleModel: cData.vehicleModel || "Standard",
          vehicleColour: cData.vehicleColour || "White",
          entryTime: sessionData.EntryTime || "N/A",
          uid: matchedUid
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const unsubAvail = onValue(ref(db, 'System/AvailableSlots'), (s) => s.exists() && setAvailableSlots(s.val()));
    const unsubSlots = onValue(ref(db, 'ParkingSlots'), (snapshot) => {
      if (snapshot.exists()) {
        setSlotsState(snapshot.val());
      } else {
        setSlotsState({ Slot1: 0, Slot2: 0, Slot3: 0 });
      }
    });

    const unsubLogs = onValue(ref(db, 'Logs/Entry'), (snapshot) => {
      if (snapshot.exists()) {
        const logs = snapshot.val();
        setTodayEntriesCount(Object.keys(logs).length);
      } else {
        setTodayEntriesCount(0);
      }
    });

    const unsubSessions = onValue(ref(db, 'ActiveSessions'), async (snapshot) => {
      if (snapshot.exists()) {
        const sessions = snapshot.val();
        setActiveSessions(sessions);
        const newSlotColors: Record<number, string> = {};

        for (const uid of Object.keys(sessions)) {
          const sSlot = sessions[uid].AssignedSlot;
          if (sSlot) {
            const cardSnap = await get(ref(db, `AuthorizedCards/${uid}`));
            if (cardSnap.exists()) {
              newSlotColors[sSlot] = cardSnap.val().vehicleColour || 'White';
            }
          }
        }
        setSlotColors(newSlotColors);
      } else {
        setActiveSessions({});
        setSlotColors({});
      }
    });
    
    const unsubActivity = onValue(ref(db, 'LiveActivity'), async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      if (isFirstLoad.current) {
        lastScanTime.current = data.ScanTime || "";
        isFirstLoad.current = false;
        return;
      }

      if (data.ScanTime && data.ScanTime !== lastScanTime.current) {
        lastScanTime.current = data.ScanTime;

        (async () => {
          if (isAnimating.current) return;

          const accessStatus = data.AccessStatus || "";
          const uid = data.LastScanUID;
          const targetSlot = data.Slot || 1;
          const uName = data.UserName || "Authorized User";
          setUserName(uName);

          if (uid) {
            const cardSnap = await get(ref(db, `AuthorizedCards/${uid}`));
            if (cardSnap.exists()) {
              const cData = cardSnap.val();
              setVehicleNumber(cData.vehicleNumber || "No Vehicle No.");
              setVehicleModel(cData.vehicleModel || "Standard");
              setVehicleColour(cData.vehicleColour || "White");
            } else {
              setVehicleNumber("Unknown Vehicle");
              setVehicleModel("N/A");
              setVehicleColour("White");
            }

            const walletSnap = await get(ref(db, `Wallets/${uid}/balance`));
            setUserBalance(walletSnap.exists() ? walletSnap.val() : 0);

            const minBalSnap = await get(ref(db, 'BillingSettings/minBalanceRequired'));
            setMinRequiredBalance(minBalSnap.exists() ? minBalSnap.val() : 50);
          }

          if (accessStatus.includes("Maintenance")) {
            isAnimating.current = true;
            setAnimType('maintenance');
            setDenyReason("System under maintenance mode");

            setAnimStep(1); await sleep(1000);
            setAnimStep(2); await sleep(3000);

            setAnimStep(0); setAnimType(null); isAnimating.current = false;
            return;
          }

          if (accessStatus.includes("Denied") || accessStatus.includes("Unknown")) {
            isAnimating.current = true; 
            setAnimType('denied');
            if (accessStatus.includes("Low Balance")) {
              setDenyReason("Low Wallet Balance");
            } else if (accessStatus.includes("Full")) {
              setDenyReason("Parking Full");
            } else {
              setDenyReason("Unauthorized Card");
            }
            
            setAnimStep(1); await sleep(1000);
            setAnimStep(2); await sleep(3000);
            
            setAnimStep(0); setAnimType(null); isAnimating.current = false;
            return;
          }

          const isEntry = accessStatus.includes("Entry"); 

          if (isEntry) {
            isAnimating.current = true; 
            setAnimType('entry');
            setAnimSlot(targetSlot);

            setAnimStep(1); await sleep(1000); 
            setAnimStep(2); await sleep(1000); 
            setAnimStep(3); await sleep(1000); 
            setAnimStep(4); await sleep(800);  
            setAnimStep(5); await sleep(3000); 
            setAnimStep(6); await sleep(2000); 
            
            setAnimStep(0); setAnimType(null); isAnimating.current = false;
          } 
          else {
            isAnimating.current = true; 
            setAnimType('exit');
            setAnimSlot(targetSlot);

            // সরাসরি ESP32-এর পাঠানো রিয়েল-টাইম LiveActivity ডেটা রিড
            setExitFee(data.DeductedFee !== undefined ? data.DeductedFee : 0);
            setExitRemainingBal(data.RemainingBalance !== undefined ? data.RemainingBalance : userBalance);
            setDuration(data.Duration || "Ongoing");

            setAnimStep(1); await sleep(1000); 
            setAnimStep(2); await sleep(1000); 
            setAnimStep(3); await sleep(1000); 
            setAnimStep(4); await sleep(800);  
            setAnimStep(5); await sleep(3000); 
            setAnimStep(6); await sleep(2000); 
            
            setAnimStep(0); setAnimType(null); isAnimating.current = false;
          }
        })();
      }
    });

    return () => { unsubAvail(); unsubSlots(); unsubLogs(); unsubSessions(); unsubActivity(); };
  }, []);

  const getAnimatedCarProps = () => {
    if (animType === null || animType === 'denied' || animType === 'maintenance') return { opacity: 0 };

    const slotIndex = slotKeys.findIndex(k => parseInt(k.replace('Slot', '')) === animSlot);
    const coord = slotIndex !== -1 ? getSlotCoords(slotIndex, totalSlots) : getSlotCoords(0, totalSlots);
    
    const slotX = coord.left;
    const slotY = coord.top;
    
    const aisleY = '42%';     
    const entryX = '5%', entryStartY = '70%';
    const exitX = '90%', exitEndY = '70%';

    if (animType === 'entry') {
      if (animStep >= 1 && animStep <= 4) return { left: entryX, top: entryStartY, rotate: 0, opacity: 1, transition: { duration: 0.5 } };
      if (animStep === 5) {
        return {
          left: [entryX, entryX, slotX, slotX],
          top: [entryStartY, aisleY, aisleY, slotY],
          rotate: [0, 90, 90, 180],
          opacity: 1,
          transition: { duration: 3, times: [0, 0.25, 0.75, 1], ease: "easeInOut" as const }
        };
      }
      if (animStep === 6) return { left: slotX, top: slotY, rotate: 180, opacity: 0 };
    } 
    
    if (animType === 'exit') {
      if (animStep >= 1 && animStep <= 4) return { left: slotX, top: slotY, rotate: 180, opacity: 1, transition: { duration: 0.5 } };
      if (animStep === 5) {
        return {
          left: [slotX, slotX, exitX, exitX],
          top: [slotY, aisleY, aisleY, exitEndY],
          rotate: [180, 90, 90, 180], 
          opacity: 1,
          transition: { duration: 3, times: [0, 0.25, 0.75, 1], ease: "easeInOut" as const }
        };
      }
      if (animStep === 6) return { left: exitX, top: exitEndY, rotate: 180, opacity: 0 };
    } 
    
    return { opacity: 0 };
  };

  return (
    <div className="space-y-6 pb-10 relative">
      
      {/* Dashboard Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between shadow-lg">
          <div><p className="text-sm text-slate-400">Total Slots</p><p className="text-4xl font-bold text-white mt-2">{totalSlots}</p></div>
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400"><Car size={28} /></div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500 flex items-center justify-between shadow-lg">
          <div><p className="text-sm text-slate-400">Available</p><p className="text-4xl font-bold text-emerald-400 mt-2">{availableSlots}</p></div>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 size={28} /></div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-rose-500 flex items-center justify-between shadow-lg">
          <div><p className="text-sm text-slate-400">Occupied</p><p className="text-4xl font-bold text-rose-400 mt-2">{Math.max(0, occupiedCount)}</p></div>
          <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400"><XCircle size={28} /></div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-cyan-500 flex items-center justify-between shadow-lg">
          <div><p className="text-sm text-slate-400">Today's Entries</p><p className="text-4xl font-bold text-white mt-2">{todayEntriesCount}</p></div>
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400"><ArrowRightLeft size={28} /></div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8 items-start">
        
        {/* ==== LEFT: CARD AUTHENTICATION PANEL ==== */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={24}/> Card Authentication
          </h3>
          
          <div className="glass-panel rounded-2xl border border-slate-700/50 bg-slate-900/80 p-5 relative overflow-hidden flex flex-col justify-between shadow-xl min-h-[400px]">
            
            <AnimatePresence mode="wait">
              {animStep === 0 && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-slate-950/70 rounded-xl p-5 text-center border border-slate-800 flex flex-col items-center justify-center h-[175px] relative overflow-hidden">
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40">
                    <span className="w-1.5 h-6 bg-cyan-400 rounded-full animate-pulse"></span>
                    <span className="w-1.5 h-9 bg-cyan-400 rounded-full animate-pulse delay-75"></span>
                    <span className="w-1.5 h-12 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                  </div>
                  <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center text-cyan-400 mb-2.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <CreditCard size={26} className="animate-bounce" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Tap Card on Reader</h4>
                  <p className="text-slate-400 text-[11px] mt-1">Waiting for hardware RFID scan...</p>
                </motion.div>
              )}

              {animType === 'maintenance' && animStep > 0 && (
                <motion.div key="maintenance" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-5 text-center flex flex-col items-center justify-center h-[175px]">
                  <Wrench size={38} className="text-amber-400 mx-auto mb-2 animate-spin" />
                  <h4 className="text-base font-bold text-amber-400 uppercase">MAINTENANCE MODE</h4>
                  <p className="text-amber-200 text-[11px] mt-1.5 font-semibold bg-amber-500/20 px-3 py-0.5 rounded-full">System Locked for Service</p>
                </motion.div>
              )}

              {animType === 'denied' && animStep > 0 && (
                <motion.div key="denied" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-center flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <AlertTriangle size={24} className="text-rose-500 animate-bounce" />
                    <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wide">ACCESS DENIED</h4>
                  </div>
                  <p className="text-rose-200 text-xs font-semibold bg-rose-500/20 px-3 py-1 rounded-lg mb-3">
                    {denyReason}
                  </p>

                  {denyReason === "Low Wallet Balance" ? (
                    <div className="bg-slate-950/90 border border-rose-500/30 p-3 rounded-xl text-left space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Current Balance:</span>
                        <span className="font-mono font-bold text-rose-400">৳{userBalance}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Minimum Required:</span>
                        <span className="font-mono font-bold text-white">৳{minRequiredBalance}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1.5 text-cyan-300 font-bold">
                        <span>Need to Recharge:</span>
                        <span className="font-mono">৳{Math.max(0, minRequiredBalance - userBalance)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px]">Card is unrecognized or parking slots are fully occupied.</p>
                  )}
                </motion.div>
              )}

              {animType !== 'denied' && animType !== 'maintenance' && animStep > 0 && (
                <motion.div key="user-card-info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                  <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                        <User size={18} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-xs">{userName}</h4>
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded-full font-semibold">Valid Card</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex items-center gap-3 shadow-md">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Car size={18} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-[11px] font-mono">{vehicleNumber}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{vehicleModel} | <span className="text-cyan-400 font-semibold">{vehicleColour}</span></p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* STATUS & LIVE BILLING BOX */}
            <AnimatePresence mode="wait">
              {animStep === 0 && (
                <div key="status-idle" className="bg-slate-950/50 border border-slate-800 p-3.5 rounded-xl text-center text-slate-400 text-xs mt-3">
                  Barrier system armed & ready.
                </div>
              )}

              {animType === 'maintenance' && animStep > 0 && (
                <div key="status-maint" className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-center text-amber-300 text-xs font-semibold mt-3">
                  Scan rejected. Gate locked due to maintenance.
                </div>
              )}

              {animType === 'denied' && animStep > 0 && (
                <div key="status-denied" className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-center text-rose-300 text-xs font-semibold mt-3">
                  Please top-up wallet from Billing Hub to proceed.
                </div>
              )}

              {animType !== 'denied' && animType !== 'maintenance' && animStep > 0 && (
                <motion.div key="status-active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2.5 mt-3">
                  
                  {/* Status Banner */}
                  <div className={clsx("p-3 rounded-xl border flex items-center justify-between shadow-lg", animType === 'entry' ? "bg-emerald-600/20 border-emerald-500/40" : "bg-cyan-600/20 border-cyan-500/40")}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className={animType === 'entry' ? "text-emerald-400" : "text-cyan-400"} />
                      <div>
                        <h5 className={clsx("font-bold text-[11px] uppercase", animType === 'entry' ? "text-emerald-400" : "text-cyan-400")}>
                          {animType === 'entry' ? "Access Granted" : "Exit Verified"}
                        </h5>
                        <p className="text-white text-[10px] mt-0.5">
                          {animType === 'entry' ? `Welcome, ${userName}!` : `Goodbye, ${userName}!`}
                        </p>
                      </div>
                    </div>
                    {animType === 'entry' && (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono shadow">
                        Slot: 0{animSlot}
                      </span>
                    )}
                  </div>

                  {/* কার্ড অথেন্টিকেশন প্যানেলে সরাসরি লাইভ কাটা বিল ও বাকি ব্যালেন্স */}
                  {animType === 'exit' ? (
                    <div className="bg-slate-950 border border-cyan-500/40 p-3.5 rounded-xl space-y-2 text-xs shadow-inner">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Duration:</span>
                        <span className="font-mono text-cyan-400 font-bold">{duration}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-rose-400 font-semibold">Deducted Fee:</span>
                        <span className="font-mono text-base font-bold text-rose-400">-৳{exitFee}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                        <span className="text-slate-400">Remaining Balance:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">৳{exitRemainingBal}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2.5 text-xs text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle size={12} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-[11px]">
                          {animStep <= 4 ? "Gate Barrier Opening..." : `Routing to Slot 0${animSlot}`}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Drive safely to your assigned slot.
                        </p>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* ==== RIGHT: LIVE IMAGE MAP WITH CARS ==== */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Car className="text-cyan-400" size={24}/> Live Parking Area <span className="text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hidden sm:inline-block">Click occupied slot to view details</span>
            </h3>
          </div>
          
          <div className="glass-panel p-2.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="relative w-full aspect-[2.3/1] rounded-xl overflow-hidden bg-cover bg-center border border-slate-800 px-8">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-90"
                style={{ backgroundImage: "url('/IMG_9274.PNG')" }}
              ></div>

              {/* ENTRY GATE */}
              <div className="absolute left-[5%] top-[57%] z-30">
                <div className="w-2 h-4 bg-slate-600 border border-slate-400 rounded-sm shadow-lg absolute -bottom-4 left-0"></div>
                <motion.div 
                  className="w-14 h-1.5 bg-gradient-to-r from-red-500 via-white to-red-500 origin-left border border-red-700"
                  animate={{ rotate: (animType === 'entry' && animStep >= 4) ? -90 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* EXIT GATE */}
              <div className="absolute right-[5%] top-[57%] z-30">
                <div className="w-2 h-4 bg-slate-600 border border-slate-400 rounded-sm shadow-lg absolute -bottom-4 right-0"></div>
                <motion.div 
                  className="w-14 h-1.5 bg-gradient-to-l from-red-500 via-white to-red-500 origin-right border border-red-700"
                  animate={{ rotate: (animType === 'exit' && animStep >= 4) ? 90 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* SLOTS */}
              {(slotKeys.length > 0 ? slotKeys : ['Slot1', 'Slot2', 'Slot3']).map((key, idx) => {
                const num = parseInt(key.replace('Slot', '')) || (idx + 1);
                const val = slotsState[key];
                const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
                const distanceVal = typeof val === 'object' && val !== null ? val.distance : undefined;
                const coords = getSlotCoords(idx, totalSlots);
                const assignedCarColor = slotColors[num] || 'White';

                return (
                  <OverlaySlot 
                    key={key}
                    num={num < 10 ? `0${num}` : `${num}`} 
                    isOccupied={isOcc} 
                    carColor={assignedCarColor} 
                    distance={distanceVal}
                    position={coords} 
                    isHidden={animType !== 'denied' && animType !== 'maintenance' && animSlot === num && animStep > 0 && animStep < 6} 
                    onSlotClick={handleSlotClick} 
                  />
                );
              })}

              <motion.div 
                className="absolute w-[6%] h-[18%] z-40 drop-shadow-2xl"
                initial={{ opacity: 0 }}
                animate={getAnimatedCarProps()}
              >
                <TopDownCar color={vehicleColour} />
              </motion.div>
            </div>
          </div>
        </div>

      </div>

      {/* ==== SLOT DETAILS MODAL ==== */}
      <AnimatePresence>
        {selectedSlotDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-md bg-slate-900/95 border border-cyan-500/40 rounded-3xl p-6 relative shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg shadow-inner">
                    0{selectedSlotDetails.slotNum}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                      Slot Telemetry
                    </h4>
                    <p className="text-xs text-cyan-400 font-mono">SECURE PARKING GRID</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSlotDetails(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3.5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-cyan-500"></div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <User size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Card Holder</span>
                    <h3 className="text-white font-bold text-base">{selectedSlotDetails.name}</h3>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Shield size={12} /> Active Secured Session
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block mb-1">Vehicle No.</span>
                    <div className="text-white font-mono font-bold text-sm bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                      {selectedSlotDetails.vehicleNumber}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block mb-1">Color Spec</span>
                    <div className="text-cyan-300 font-semibold text-sm flex items-center gap-2 mt-1">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] inline-block"></span>
                      {selectedSlotDetails.vehicleColour}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-2.5">
                    <span className="text-slate-400 flex items-center gap-1.5"><Car size={14} className="text-blue-400"/> Vehicle Model:</span>
                    <span className="text-white font-semibold">{selectedSlotDetails.vehicleModel}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-800/60 pb-2.5">
                    <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-cyan-400"/> Entry Time:</span>
                    <span className="text-cyan-300 font-mono font-bold">{selectedSlotDetails.entryTime}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5"><Shield size={14} className="text-emerald-400"/> Card UID:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{selectedSlotDetails.uid}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => setSelectedSlotDetails(null)}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  Close Telemetry
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}