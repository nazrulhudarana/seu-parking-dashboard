import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentID = url.searchParams.get('paymentID');
  const status = url.searchParams.get('status');
  const origin = url.origin;

  if (status !== 'success' || !paymentID) {
    return NextResponse.redirect(`${origin}/?payment=failed`);
  }

  try {
    const settingsSnap = await get(ref(db, 'BillingSettings'));
    if (!settingsSnap.exists()) {
      return NextResponse.redirect(`${origin}/?payment=error_settings`);
    }

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
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': username,
        'password': password
      },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) return NextResponse.redirect(`${origin}/?payment=error_token`);

    // 2. Execute Payment
    const executeRes = await fetch(`${baseUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': tokenData.id_token,
        'X-APP-Key': appKey
      },
      body: JSON.stringify({ paymentID })
    });
    const executeData = await executeRes.json();

    if (executeRes.ok && executeData.statusCode === '0000') {
      const uid = executeData.payerReference;
      const amount = parseFloat(executeData.amount || '0');
      const trxID = executeData.trxID || `BK-${Date.now()}`;

      // Update Wallet & Transactions in Firebase
      const walletSnap = await get(ref(db, `Wallets/${uid}`));
      const currentBal = walletSnap.exists() ? (walletSnap.val().balance || 0) : 0;
      const newBal = currentBal + amount;
      const timestamp = new Date().toLocaleString('en-GB');

      const updates: any = {};
      updates[`Wallets/${uid}/balance`] = newBal;
      updates[`Wallets/${uid}/lastRecharge`] = timestamp;
      updates[`Wallets/${uid}/status`] = 'ACTIVE';
      updates[`Transactions/${trxID}`] = {
        uid,
        type: 'bKash Gateway',
        amount,
        prevBalance: currentBal,
        newBalance: newBal,
        timestamp,
        trxID,
        desc: 'Online bKash Payment'
      };

      await update(ref(db), updates);

      // Redirect to Dedicated Payment Success Page with Details
      return NextResponse.redirect(`${origin}/payment-success?trxID=${trxID}&amount=${amount}&uid=${uid}&time=${encodeURIComponent(timestamp)}`);
    } else {
      return NextResponse.redirect(`${origin}/?payment=execution_failed`);
    }

  } catch (err) {
    return NextResponse.redirect(`${origin}/?payment=server_error`);
  }
}