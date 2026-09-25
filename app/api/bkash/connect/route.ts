import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { isSandbox, appKey, appSecret, username, password } = await req.json();

    const baseUrl = isSandbox 
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout' 
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';

    // bKash Tokenized API Standard:
    // username & password MUST BE IN HEADERS
    // app_key & app_secret MUST BE IN BODY
    const response = await fetch(`${baseUrl}/token/grant`, {
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

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        message: `bKash Server Error: ${responseText || 'Invalid response from bKash server'}` 
      }, { status: 400 });
    }

    // bKash validation check
    if (!response.ok || !data.id_token) {
      return NextResponse.json({ 
        success: false, 
        message: data.statusMessage || data.message || 'bKash API Authentication Failed! Check username, password, app_key & secret.' 
      }, { status: 400 });
    }

    // Real handshake token successfully generated!
    return NextResponse.json({ 
      success: true, 
      message: `Successfully authenticated & connected to real bKash ${isSandbox ? 'Sandbox' : 'Live'} Server!`,
      id_token: data.id_token 
    });

  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      message: 'Network error connecting to bKash: ' + err.message 
    }, { status: 500 });
  }
}