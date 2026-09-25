'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../lib/firebase';
import { Car, CreditCard, Phone, Zap, RefreshCw, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import clsx from 'clsx';

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
  const uniqueGradId = `grad-landing-${c.primary.replace('#', '')}`;

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

const OverlaySlot = ({ num, isOccupied, carColor, distance, position }: { num: string, isOccupied: boolean, carColor: string, distance: number | undefined, position: any }) => {
  return (
    <div className="absolute flex flex-col items-center justify-end transition-all duration-500 rounded-sm pb-4 group" style={{ ...position }}>
      <div className={clsx(
        "absolute inset-0 transition-colors duration-500 z-0 border-x-[4px] border-t-[4px] rounded-t-lg shadow-[0_0_20px_rgba(0,0,0,0.6)]",
        isOccupied ? "bg-rose-500/20 border-rose-500/90" : "bg-emerald-500/10 border-white/90"
      )} />
      <div className="absolute top-2 left-3 font-bold text-base md:text-lg text-white z-10 font-mono drop-shadow-md">{num}</div>
      {distance !== undefined && (
        <div className="absolute top-2 right-2 bg-slate-950/80 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-mono text-cyan-300 z-20">
          {distance}cm
        </div>
      )}
      <div className="z-20 w-[72%] h-[82%] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isOccupied ? (
            <motion.div key="car" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col items-center justify-center relative">
              <div className="rotate-180 w-full h-full"><TopDownCar color={carColor} /></div>
              <span className="absolute -bottom-5 md:-bottom-6 bg-rose-600 border border-rose-400 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse">
                {distance !== undefined ? `${distance}cm` : "OCCUPIED"}
              </span>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col items-center justify-center relative">
              <span className="text-emerald-400/50 font-bold text-3xl md:text-4xl font-mono">P</span>
              <span className="absolute -bottom-5 md:-bottom-6 bg-emerald-600 border border-emerald-400 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">FREE</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function CustomerLandingPage() {
  const [availableSlots, setAvailableSlots] = useState<number>(3);
  const [slotsState, setSlotsState] = useState<Record<string, any>>({});
  const [slotColors, setSlotColors] = useState<Record<number, string>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [billingSettings, setBillingSettings] = useState<any>({ isSandbox: true });

  const [identifier, setIdentifier] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [searchedUid, setSearchedUid] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsubAvail = onValue(ref(db, 'System/AvailableSlots'), (s) => s.exists() && setAvailableSlots(s.val()));
    const unsubSlots = onValue(ref(db, 'ParkingSlots'), (s) => s.exists() ? setSlotsState(s.val()) : setSlotsState({ Slot1: 0, Slot2: 0, Slot3: 0 }));
    const unsubUsers = onValue(ref(db, 'AuthorizedCards'), (s) => s.exists() && setUsers(s.val()));
    const unsubWallets = onValue(ref(db, 'Wallets'), (s) => s.exists() && setWallets(s.val()));
    const unsubSettings = onValue(ref(db, 'BillingSettings'), (s) => s.exists() && setBillingSettings(s.val()));

    const unsubSessions = onValue(ref(db, 'ActiveSessions'), async (snapshot) => {
      if (snapshot.exists()) {
        const sessions = snapshot.val();
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
        setSlotColors({});
      }
    });

    return () => { unsubAvail(); unsubSlots(); unsubUsers(); unsubWallets(); unsubSettings(); unsubSessions(); };
  }, []);

  const slotKeys = Object.keys(slotsState).sort((a, b) => parseInt(a.replace('Slot', '')) - parseInt(b.replace('Slot', '')));
  const totalSlots = slotKeys.length > 0 ? slotKeys.length : 3;
  let occupiedCount = 0;
  slotKeys.forEach(k => {
    const val = slotsState[k];
    if (typeof val === 'object' && val !== null ? val.status === 1 : val === 1) occupiedCount++;
  });

  const getSlotCoords = (index: number) => {
    const positions = [
      { left: '26%', top: '48%', width: '13%', height: '42%' },
      { left: '43.5%', top: '48%', width: '13%', height: '42%' },
      { left: '61%', top: '48%', width: '13%', height: '42%' }
    ];
    return positions[index] || positions[0];
  };

  const handleSearchUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setLoading(true);
    setMessage(null);

    setTimeout(() => {
      let foundUid = null;
      let foundData = null;
      const q = identifier.trim().toLowerCase();

      for (const uid of Object.keys(users)) {
        const u = users[uid];
        if (uid.toLowerCase() === q || u.phone?.toLowerCase() === q || u.vehicleNumber?.toLowerCase() === q) {
          foundUid = uid;
          foundData = u;
          break;
        }
      }

      if (foundUid && foundData) {
        setSearchedUid(foundUid);
        setSearchedUser(foundData);
        setMessage({ text: 'Account found successfully!', type: 'success' });
      } else {
        setSearchedUid(null);
        setSearchedUser(null);
        setMessage({ text: 'No user found with this Phone Number or Card UID.', type: 'error' });
      }
      setLoading(false);
    }, 500);
  };

  const initiateBkashPayment = async (amount: number) => {
    if (!searchedUid || !amount || amount <= 0) {
      setMessage({ text: 'Please enter a valid recharge amount.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/bkash/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount, 
          uid: searchedUid,
          isSandbox: billingSettings.isSandbox ?? true,
          appKey: billingSettings.bkashAppKey || '',
          appSecret: billingSettings.bkashAppSecret || '',
          username: billingSettings.bkashUsername || '',
          password: billingSettings.bkashPassword || '',
          origin: window.location.origin
        })
      });

      const data = await res.json();
      setLoading(false);

      if (data.success && data.bkashURL) {
        window.location.href = data.bkashURL;
      } else {
        setMessage({ text: data.message || 'Failed to initialize bKash payment gateway.', type: 'error' });
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ text: 'Network error connecting to bKash payment API.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-72 md:w-96 h-72 md:h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <div className="max-w-5xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold shadow-inner">
            <Car size={20} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black tracking-wider uppercase bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
              SEU Smart Parking
            </h2>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-mono">IoT Telemetry Hub</p>
          </div>
        </div>

        <Link href="/login" className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-[11px] md:text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-all shadow-md">
          <Shield size={13} /> Admin Login
        </Link>
      </div>

      {/* Hero Header */}
      <div className="max-w-3xl mx-auto text-center space-y-2.5 px-2">
        <span className="px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] md:text-xs font-mono uppercase tracking-widest inline-block">
          Public Access Portal
        </span>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
          Live Parking Telemetry & Secure bKash Top-Up
        </h1>
        <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
          Monitor real-time slot occupancy and instantly top-up your RFID parking wallet securely via bKash.
        </p>
      </div>

      {/* Metrics */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 md:p-5 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between shadow-lg bg-slate-900/60 border border-slate-800/80">
          <div><p className="text-[11px] text-slate-400 font-medium">Total Slots</p><p className="text-2xl md:text-3xl font-bold text-white mt-0.5">{totalSlots}</p></div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Car size={22} /></div>
        </div>
        <div className="p-4 md:p-5 rounded-2xl border-l-4 border-emerald-500 flex items-center justify-between shadow-lg bg-slate-900/60 border border-slate-800/80">
          <div><p className="text-[11px] text-slate-400 font-medium">Available Slots</p><p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-0.5">{availableSlots}</p></div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 size={22} /></div>
        </div>
        <div className="p-4 md:p-5 rounded-2xl border-l-4 border-rose-500 flex items-center justify-between shadow-lg bg-slate-900/60 border border-slate-800/80">
          <div><p className="text-[11px] text-slate-400 font-medium">Occupied Slots</p><p className="text-2xl md:text-3xl font-bold text-rose-400 mt-0.5">{Math.max(0, occupiedCount)}</p></div>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400"><XCircle size={22} /></div>
        </div>
      </div>

      {/* Live Map */}
      <div className="max-w-5xl mx-auto space-y-3">
        <h3 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
          <Car className="text-cyan-400" size={18}/> Live Parking Floor Map
        </h3>
        <div className="p-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl relative overflow-hidden">
          <div className="relative w-full aspect-[2/1] sm:aspect-[2.3/1] rounded-xl overflow-hidden bg-cover bg-center border border-slate-800 px-4 sm:px-8" style={{ backgroundImage: "url('/IMG_9274.PNG')" }}>
            {(slotKeys.length > 0 ? slotKeys : ['Slot1', 'Slot2', 'Slot3']).map((key, idx) => {
              const num = parseInt(key.replace('Slot', '')) || (idx + 1);
              const val = slotsState[key];
              const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
              return (
                <OverlaySlot key={key} num={num < 10 ? `0${num}` : `${num}`} isOccupied={isOcc} carColor={slotColors[num] || 'White'} distance={undefined} position={getSlotCoords(idx)} />
              );
            })}
          </div>
        </div>
      </div>

      {/* Wallet & bKash Recharge */}
      <div className="max-w-5xl mx-auto p-5 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl space-y-6">
        <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
          <CreditCard className="text-pink-500" size={20} /> Customer Account & bKash Top-Up Portal
        </h3>

        <form onSubmit={handleSearchUser} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input 
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter Phone Number, Card UID, or Vehicle No."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-xs md:text-sm text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 shrink-0">
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />} Lookup Account
          </button>
        </form>

        {message && (
          <div className={clsx("p-3 rounded-xl text-xs font-semibold flex items-center gap-2", message.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border border-rose-500/30")}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {searchedUser && searchedUid && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-pink-500/30 space-y-6 shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-base md:text-lg font-bold text-white">{searchedUser.name}</h4>
                <p className="text-[11px] md:text-xs text-slate-400 font-mono mt-0.5">UID: {searchedUid} | Phone: {searchedUser.phone || 'N/A'}</p>
              </div>
              <div className="text-left sm:text-right bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 w-full sm:w-auto">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Current Balance</span>
                <span className="text-2xl md:text-3xl font-mono font-bold text-cyan-400">৳{wallets[searchedUid]?.balance || 0}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select Top-Up Amount:</p>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[100, 200, 500, 1000].map(amt => (
                  <button key={amt} onClick={() => initiateBkashPayment(amt)} disabled={loading} className="py-2.5 sm:py-3 rounded-xl bg-slate-900 hover:bg-pink-600 hover:text-white text-slate-200 font-mono font-bold text-xs sm:text-sm transition-all border border-slate-800 hover:border-pink-500 shadow flex items-center justify-center gap-1">
                    <span>৳{amt}</span>
                  </button>
                ))}
              </div>

              {/* Custom Amount & bKash Payment Trigger Button (Placed nicely at bottom) */}
              <div className="space-y-3 pt-2">
                <input 
                  type="number" 
                  value={rechargeAmount} 
                  onChange={(e) => setRechargeAmount(e.target.value)} 
                  placeholder="Or enter custom recharge amount (৳)" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-pink-500 shadow-inner" 
                />
                <button 
                  onClick={() => initiateBkashPayment(Number(rechargeAmount))} 
                  disabled={loading} 
                  className="w-full py-3.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <CreditCard size={18} />}
                  Proceed to bKash Secure Checkout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}