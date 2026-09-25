import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export async function POST(req: Request) {
  try {
    const { uid, type, entryTime, exitTime, slot, duration, fee, remainingBalance } = await req.json();

    if (!uid || !type) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

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

    const smtpSnap = await get(ref(db, 'SMTPConfig'));
    if (!smtpSnap.exists()) {
      return NextResponse.json({ success: false, message: 'SMTP settings not configured.' }, { status: 400 });
    }
    const smtp = smtpSnap.val();

    const transporter = nodemailer.createTransport({
      host: smtp.host || 'smtp.gmail.com',
      port: Number(smtp.port) || 587,
      secure: false,
      auth: { user: smtp.user, pass: smtp.pass }
    });

    const billingSnap = await get(ref(db, 'BillingSettings'));
    const billing = billingSnap.exists() ? billingSnap.val() : { firstHourRate: 30, additionalHourRate: 20 };

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

    if (type === 'EXIT') {
      // ================= EMBEDDED VECTOR LOGO SVG BUFFER =================
      const svgLogo = `
        <svg width="180" height="50" viewBox="0 0 360 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#f97316" />
              <stop offset="100%" stop-color="#eab308" />
            </linearGradient>
          </defs>
          <path d="M10 10 H50 C75 10 90 25 90 45 C90 65 75 80 50 80 H30 V95 H10 Z" fill="url(#grad1)" />
          <text x="105" y="42" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#0f172a" letter-spacing="2">SEU</text>
          <text x="105" y="75" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#f97316" letter-spacing="1">PARKING</text>
          <text x="235" y="73" font-family="Arial, sans-serif" font-style="italic" font-weight="bold" font-size="11" fill="#64748b">By Nazrul</text>
        </svg>
      `;
      const svgBuffer = Buffer.from(svgLogo);

      const pdfBuffers: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });
      doc.on('data', (chunk: Buffer) => pdfBuffers.push(chunk));

      doc.image(svgBuffer, 50, 40, { width: 120 });
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

      doc.rect(50, 190, 500, 25).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(10).text('Description / Breakdown', 60, 198);
      doc.text('Duration', 300, 198);
      doc.text('Amount (BDT)', 450, 198, { align: 'right' });

      doc.fillColor('#1e293b').fontSize(10);
      doc.text(`Parking Fee (${duration})`, 60, 230);
      doc.text(duration, 300, 230);
      doc.text(`Tk ${fee}.00`, 450, 230, { align: 'right' });

      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 255).lineTo(550, 255).stroke();

      doc.text('Total Deducted Fee:', 330, 280);
      doc.text(`Tk ${fee}.00`, 450, 280, { align: 'right' });

      doc.text('Remaining Wallet Balance:', 330, 305);
      doc.text(`Tk ${remainingBalance}.00`, 450, 305, { align: 'right' });

      doc.fontSize(9).fillColor('#94a3b8').text('Thank you for parking with SEU Smart Parking!', 50, 450, { align: 'center' });
      doc.end();

      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(pdfBuffers));
        });
      });

      await transporter.sendMail({
        from: `"SEU Smart Parking" <${smtp.user}>`,
        to: userEmail,
        subject: `Parking Exit Invoice - Total Fee: Tk ${fee}`,
        text: `Dear ${userName},\n\nYou have successfully exited from Slot ${slot}.\nEntry Time: ${entryTime}\nExit Time: ${exitTime}\nTotal Duration: ${duration}\nDeducted Fee: Tk ${fee}\nRemaining Balance: Tk ${remainingBalance}\n\nPlease find attached your detailed PDF invoice.\n\nThank you for using SEU Smart Parking!`,
        attachments: [
          {
            filename: `Parking_Invoice_${slot}.pdf`,
            content: pdfBuffer,
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