import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, uid, isSandbox, appKey, appSecret, username, password, origin } = await req.json();

    if (!amount || !uid) {
      return NextResponse.json({ success: false, message: 'Invalid amount or user UID.' }, { status: 400 });
    }

    // Dynamic origin detection (Supports both Localhost and Vercel Domain)
    const requestHost = req.headers.get('host') || '';
    const currentOrigin = requestHost.includes('localhost') 
      ? `http://${requestHost}` 
      : (origin || 'https://seu-parking-dashboard.vercel.app');

    const callbackURL = `${currentOrigin}/api/bkash/callback`;

    const baseUrl = isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout' 
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

    // 1. Grant Token
    const tokenRes = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'username': username,
        'password': password
      },
      body: JSON.stringify({
        app_key: appKey,
        app_secret: appSecret
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      return NextResponse.json({ success: false, message: 'bKash Authentication Failed. Check credentials.' }, { status: 400 });
    }

    // 2. Create Payment
    const createRes = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': tokenData.id_token,
        'X-APP-Key': appKey
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: uid,
        callbackURL: callbackURL,
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: `Inv-${Date.now()}`
      })
    });

    const createData = await createRes.json();

    if (createData.statusCode === '0000' && createData.bkashURL) {
      return NextResponse.json({ success: true, bkashURL: createData.bkashURL });
    } else {
      return NextResponse.json({ success: false, message: createData.statusMessage || 'Failed to create bKash payment.' }, { status: 400 });
    }

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Server error: ' + err.message }, { status: 500 });
  }
}