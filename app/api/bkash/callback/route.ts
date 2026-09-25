import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get('paymentID');
  const status = url.searchParams.get('status');
  const origin = url.origin;

  if (status !== 'success' || !paymentID) {
    return NextResponse.redirect(`${origin}/?payment=failed&status=${status || 'unknown'}`);
  }

  try {
    const settingsSnap = await get(ref(db, 'BillingSettings'));
    if (!settingsSnap.exists()) return NextResponse.redirect(`${origin}/?payment=error_settings`);

    const settings = settingsSnap.val();
    const isSandbox = settings.isSandbox ?? true;
    const appKey = settings.bkashAppKey;
    const appSecret = settings.bkashAppSecret;
    const username = settings.bkashUsername;
    const password = settings.bkashPassword;

    const baseUrl = isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout' 
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

    // 1. Get Token
    const tokenRes = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'username': username, 'password': password },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error("bKash Token Grant Failed:", tokenData);
      return NextResponse.redirect(`${origin}/?payment=error_token`);
    }

    // 2. Execute Payment
    const executeRes = await fetch(`${baseUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': tokenData.id_token, 'X-APP-Key': appKey },
      body: JSON.stringify({ paymentID })
    });
    const executeData = await executeRes.json();

    if (!executeRes.ok || executeData.statusCode !== '0000') {
      console.error("bKash Execution Error Details:", executeData);
      const errorMsg = encodeURIComponent(executeData.statusMessage || 'Execution Failed');
      return NextResponse.redirect(`${origin}/?payment=execution_failed&reason=${errorMsg}`);
    }

    const uid = executeData.payerReference;
    const amount = parseFloat(executeData.amount || '0');
    const trxID = executeData.trxID || `BK-${Date.now()}`;
    const timestamp = new Date().toLocaleString('en-GB');

    // Fetch User Details from Firebase
    const userSnap = await get(ref(db, `AuthorizedCards/${uid}`));
    const userData = userSnap.exists() ? userSnap.val() : {};
    const userName = userData.name || 'Valued Customer';
    const userEmail = userData.email || '';
    const vehicleNo = userData.vehicleNumber || 'N/A';

    // Update Wallet & Transactions
    const walletSnap = await get(ref(db, `Wallets/${uid}`));
    const currentBal = walletSnap.exists() ? (walletSnap.val().balance || 0) : 0;
    const newBal = currentBal + amount;

    const updates: any = {};
    updates[`Wallets/${uid}/balance`] = newBal;
    updates[`Wallets/${uid}/lastRecharge`] = timestamp;
    updates[`Wallets/${uid}/status`] = 'ACTIVE';
    updates[`Transactions/${trxID}`] = {
      uid, type: 'bKash Gateway', amount, prevBalance: currentBal, newBalance: newBal, timestamp, trxID, desc: 'Online bKash Payment'
    };
    await update(ref(db), updates);

    // ================= PDF GENERATION IN MEMORY BUFFER =================
    const pdfBuffers: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on('data', (chunk: Buffer) => pdfBuffers.push(chunk));

    doc.fontSize(20).text('SEU Smart Parking', 200, 50, { align: 'right' });
    doc.fontSize(10).fillColor('#64748b').text('Official bKash Tax Invoice / Receipt', 200, 75, { align: 'right' });
    doc.moveDown(2);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 110).lineTo(550, 110).stroke();
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#1e293b');
    doc.text(`Transaction ID : ${trxID}`, 50, 125);
    doc.text(`Date & Time    : ${timestamp}`, 50, 140);
    doc.text(`Payment Gateway: bKash Tokenized`, 50, 155);

    doc.text(`Customer Name  : ${userName}`, 320, 125);
    doc.text(`Vehicle No     : ${vehicleNo}`, 320, 140);
    doc.text(`Card UID       : ${uid}`, 320, 155);
    doc.moveDown(2);

    doc.rect(50, 190, 500, 25).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(10).text('Description', 60, 198);
    doc.text('Method', 300, 198);
    doc.text('Amount (BDT)', 450, 198, { align: 'right' });

    doc.fillColor('#1e293b').fontSize(10);
    doc.text('RFID Parking Wallet Top-Up', 60, 230);
    doc.text('bKash Checkout', 300, 230);
    doc.text(`Tk ${amount}.00`, 450, 230, { align: 'right' });

    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 255).lineTo(550, 255).stroke();

    doc.text('Subtotal:', 350, 275);
    doc.text(`Tk ${amount}.00`, 450, 275, { align: 'right' });

    doc.text('Gateway Fee (0%):', 350, 295);
    doc.text('Tk 0.00', 450, 295, { align: 'right' });

    doc.fontSize(12).fillColor('#0f172a').text('Total Paid:', 350, 320);
    doc.text(`Tk ${amount}.00`, 450, 320, { align: 'right' });

    doc.fontSize(9).fillColor('#94a3b8').text('Thank you for using SEU Smart Parking!', 50, 450, { align: 'center' });
    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(pdfBuffers));
      });
    });

    // ================= SEND EMAIL VIA FIREBASE SMTP CONFIG =================
    const smtpSnap = await get(ref(db, 'SMTPConfig'));
    if (smtpSnap.exists() && userEmail) {
      const smtp = smtpSnap.val();

      const transporter = nodemailer.createTransport({
        host: smtp.host || 'smtp.gmail.com',
        port: Number(smtp.port) || 587,
        secure: false,
        auth: {
          user: smtp.user,
          pass: smtp.pass
        }
      });

      await transporter.sendMail({
        from: `"SEU Smart Parking" <${smtp.user}>`,
        to: userEmail,
        subject: `Payment Successful & Invoice #${trxID}`,
        text: `Dear ${userName},\n\nYour bKash top-up of Tk ${amount} was successful.\nPlease find attached your professional invoice PDF.\n\nThank you for using SEU Smart Parking!`,
        attachments: [
          {
            filename: `Invoice_${trxID}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
    }

    return NextResponse.redirect(`${origin}/?payment=success&trxID=${trxID}&amount=${amount}`);

  } catch (err) {
    console.error("Callback Server Error:", err);
    return NextResponse.redirect(`${origin}/?payment=server_error`);
  }
}