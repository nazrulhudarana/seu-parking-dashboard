import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, uid, isSandbox, appKey, appSecret, username, password, origin } = await req.json();

    const baseUrl = isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout' 
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

    // 1. Grant Token
    const tokenRes = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': username.trim(),
        'password': password.trim()
      },
      body: JSON.stringify({
        app_key: appKey.trim(),
        app_secret: appSecret.trim()
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      return NextResponse.json({ success: false, message: 'bKash Token Grant Failed.' }, { status: 400 });
    }

    // 2. Create Payment with Dynamic Callback URL
    const callbackURL = `${origin}/api/bkash/callback`;

    const paymentRes = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': tokenData.id_token,
        'X-APP-Key': appKey.trim()
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: uid,
        callbackURL: callbackURL,
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: `INV_${Date.now()}`
      })
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok || !paymentData.bkashURL) {
      return NextResponse.json({ success: false, message: paymentData.statusMessage || 'Failed to create bKash payment.' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      bkashURL: paymentData.bkashURL, 
      paymentID: paymentData.paymentID 
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Server error: ' + err.message }, { status: 500 });
  }
}