import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { uid, type, entryTime, exitTime, slot, duration, fee, remainingBalance } = await req.json();

    if (!uid || !type) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    // Fetch user details
    const userSnap = await get(ref(db, `AuthorizedCards/${uid}`));
    if (!userSnap.exists()) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }
    const userData = userSnap.val();
    const userEmail = userData.email;
    const userName = userData.name || 'Valued Customer';
    const vehicleNo = userData.vehicleNumber || 'N/A';

    if (!userEmail) {
      return NextResponse.json({ success: false, message: 'User email not configured.' }, { status: 400 });
    }

    // Fetch SMTP config from Firebase settings
    const smtpSnap = await get(ref(db, 'SMTPConfig'));
    if (!smtpSnap.exists()) {
      return NextResponse.json({ success: false, message: 'SMTP settings not configured in admin panel.' }, { status: 400 });
    }
    const smtp = smtpSnap.val();

    const transporter = nodemailer.createTransport({
      host: smtp.host || 'smtp.gmail.com',
      port: Number(smtp.port) || 587,
      secure: false,
      auth: { user: smtp.user, pass: smtp.pass }
    });

    // Fetch Billing Settings for rates
    const billingSnap = await get(ref(db, 'BillingSettings'));
    const billing = billingSnap.exists() ? billingSnap.val() : { firstHourRate: 30, additionalHourRate: 20 };

    // ================= 1. ENTRY NOTIFICATION EMAIL =================
    if (type === 'ENTRY') {
      const walletSnap = await get(ref(db, `Wallets/${uid}`));
      const balance = walletSnap.exists() ? (walletSnap.val().balance || 0) : 0;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; text-align: center;">SEU Smart Parking - Entry Notice</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your vehicle (<strong>${vehicleNo}</strong>) has successfully checked into slot <strong>Slot ${slot}</strong>.</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Entry Time:</strong> ${entryTime}</p>
            <p style="margin: 5px 0;"><strong>Current Wallet Balance:</strong> Tk ${balance}.00</p>
          </div>

          <h4 style="color: #475569;">Billing Structure & Rates:</h4>
          <ul style="color: #64748b; font-size: 13px;">
            <li>First Hour Rate: Tk ${billing.firstHourRate}</li>
            <li>Additional Hour Rate: Tk ${billing.additionalHourRate} / hr</li>
            <li>Grace Period: ${billing.gracePeriodMins || 10} Mins</li>
          </ul>
          
          <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 30px;">Thank you for using SEU Smart Parking by Nazrul!</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"SEU Smart Parking" <${smtp.user}>`,
        to: userEmail,
        subject: `Parking Entry Alert - Slot ${slot}`,
        html: htmlContent
      });

      return NextResponse.json({ success: true, message: 'Entry email sent successfully.' });
    }

    // ================= 2. EXIT NOTIFICATION & PDF INVOICE =================
    if (type === 'EXIT') {
      const pdfPath = path.join(process.cwd(), `public/parking_invoice_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Logo branding
      const logoPath = path.join(process.cwd(), 'public/logo.PNG');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 100 });
      }

      doc.fontSize(20).text('SEU Smart Parking', 200, 50, { align: 'right' });
      doc.fontSize(10).fillColor('#64748b').text('Official Parking Breakdown Invoice', 200, 75, { align: 'right' });
      doc.moveDown(2);

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 110).lineTo(550, 110).stroke();
      doc.moveDown(1);

      doc.fontSize(10).fillColor('#1e293b');
      doc.text(`Customer Name  : ${userName}`, 50, 125);
      doc.text(`Vehicle No     : ${vehicleNo}`, 50, 140);
      doc.text(`Card UID       : ${uid}`, 50, 155);

      doc.text(`Entry Time     : ${entryTime}`, 320, 125);
      doc.text(`Exit Time      : ${exitTime}`, 320, 140);
      doc.text(`Allocated Slot : Slot ${slot}`, 320, 155);
      doc.moveDown(2);

      // Table Header
      doc.rect(50, 190, 500, 25).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(10).text('Description / Breakdown', 60, 198);
      doc.text('Duration', 300, 198);
      doc.text('Amount (BDT)', 450, 198, { align: 'right' });

      // Table Row
      doc.fillColor('#1e293b').fontSize(10);
      doc.text(`Parking Fee (${duration})`, 60, 230);
      doc.text(duration, 300, 230);
      doc.text(`Tk ${fee}.00`, 450, 230, { align: 'right' });

      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 255).lineTo(550, 255).stroke();

      doc.text('Total Deducted Fee:', 330, 280);
      doc.text(`Tk ${fee}.00`, 450, 280, { align: 'right' });

      doc.text('Remaining Wallet Balance:', 330, 305);
      doc.text(`Tk ${remainingBalance}.00`, 450, 305, { align: 'right' });

      doc.fontSize(9).fillColor('#94a3b8').text('Thank you for parking with SEU Smart Parking by Nazrul!', 50, 450, { align: 'center' });
      doc.end();

      await new Promise((resolve) => stream.on('finish', resolve));

      await transporter.sendMail({
        from: `"SEU Smart Parking" <${smtp.user}>`,
        to: userEmail,
        subject: `Parking Exit Invoice - Total Fee: Tk ${fee}`,
        text: `Dear ${userName},\n\nYou have successfully exited from Slot ${slot}.\nEntry Time: ${entryTime}\nExit Time: ${exitTime}\nTotal Duration: ${duration}\nDeducted Fee: Tk ${fee}\nRemaining Balance: Tk ${remainingBalance}\n\nPlease find attached your detailed PDF invoice.\n\nThank you for using SEU Smart Parking!`,
        attachments: [
          {
            filename: `Parking_Invoice_${slot}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      });

      return NextResponse.json({ success: true, message: 'Exit PDF invoice sent successfully.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid notification type.' }, { status: 400 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Server error: ' + err.message }, { status: 500 });
  }
}