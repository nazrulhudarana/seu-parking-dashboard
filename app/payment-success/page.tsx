'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { CheckCircle2, Download, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const trxID = searchParams.get('trxID') || 'N/A';
  const amount = searchParams.get('amount') || '0';
  const uid = searchParams.get('uid') || 'N/A';
  const time = searchParams.get('time') || new Date().toLocaleString();

  const [userName, setUserName] = useState('Valued Customer');
  const [vehicleNo, setVehicleNo] = useState('N/A');

  useEffect(() => {
    if (uid !== 'N/A') {
      get(ref(db, `AuthorizedCards/${uid}`)).then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.name) setUserName(data.name);
          if (data.vehicleNumber) setVehicleNo(data.vehicleNumber);
        }
      });
    }
  }, [uid]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>bKash Receipt - ${trxID}</title>
        <style>
          body { font-family: monospace; padding: 40px; color: #1e293b; max-width: 400px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; }
          .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .total { font-size: 1.2rem; font-weight: bold; border-top: 1px dashed #1e293b; padding-top: 12px; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SEU Smart Parking</h2>
          <p>bKash Top-Up Receipt</p>
        </div>
        <div class="row"><span>Trx ID:</span> <strong>${trxID}</strong></div>
        <div class="row"><span>Customer:</span> <strong>${userName}</strong></div>
        <div class="row"><span>Vehicle No:</span> <strong>${vehicleNo}</strong></div>
        <div class="row"><span>Card UID:</span> <strong>${uid}</strong></div>
        <div class="row"><span>Date & Time:</span> <strong>${time}</strong></div>
        <div class="row"><span>Payment Gateway:</span> <strong>bKash Tokenized</strong></div>
        <div class="row total"><span>Recharged Amount:</span> <span>৳${amount}</span></div>
        <p style="text-align: center; margin-top: 30px; font-size: 0.75rem; color: #64748b;">Thank you for using SEU Smart Parking!</p>
      </body>
      <script>window.onload = function() { window.print(); window.close(); }</script>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const text = `
=========================================
          SEU SMART PARKING              
       Official bKash Receipt            
=========================================
Transaction ID : ${trxID}
Customer Name  : ${userName}
Vehicle No     : ${vehicleNo}
Card UID       : ${uid}
Date & Time    : ${time}
Gateway        : bKash Tokenized Checkout
-----------------------------------------
RECHARGED AMT  : ৳${amount}
-----------------------------------------
Status         : SUCCESSFUL

Thank you for using SEU Smart Parking!
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bKash_Receipt_${trxID}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 to-cyan-500"></div>

        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg">
          <CheckCircle2 size={36} />
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Payment Successful!</h2>
          <p className="text-xs text-slate-400 mt-1">Your bKash top-up has been successfully added to your parking wallet.</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2.5 font-mono text-xs">
          <div className="flex justify-between text-slate-400"><span>Trx ID:</span> <strong className="text-pink-400">{trxID}</strong></div>
          <div className="flex justify-between text-slate-400"><span>Name:</span> <span className="text-white">{userName}</span></div>
          <div className="flex justify-between text-slate-400"><span>Vehicle No:</span> <span className="text-white">{vehicleNo}</span></div>
          <div className="flex justify-between text-slate-400"><span>Amount:</span> <strong className="text-emerald-400 text-sm">৳{amount}</strong></div>
          <div className="flex justify-between text-slate-400"><span>Time:</span> <span className="text-slate-300">{time}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={handlePrint} className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow">
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={handleDownload} className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow">
            <Download size={16} /> Save Text
          </button>
        </div>

        <Link href="/" className="inline-flex items-center gap-2 text-xs text-cyan-400 hover:underline pt-2">
          <ArrowLeft size={14} /> Back to Home / Parking Portal
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-50 bg-slate-950 text-white flex items-center justify-center">Loading receipt details...</div>}>
      <SuccessContent />
    </Suspense>
  );
}