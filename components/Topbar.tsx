'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Search, AlertTriangle, Car, Trash2, LogOut, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import clsx from 'clsx';

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [minBalance, setMinBalance] = useState<number>(50);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubWallets = onValue(ref(db, 'Wallets'), s => setWallets(s.val() || {}));
    const unsubUsers = onValue(ref(db, 'AuthorizedCards'), s => setUsers(s.val() || {}));
    const unsubSettings = onValue(ref(db, 'BillingSettings'), s => {
      if(s.exists() && s.val().minBalanceRequired) {
        setMinBalance(s.val().minBalanceRequired);
      }
    });

    const unsubActivity = onValue(ref(db, 'LiveActivity'), s => {
      if (s.exists()) {
        const val = s.val();
        setLiveActivities(prev => [val, ...prev.slice(0, 9)]);
      }
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubWallets();
      unsubUsers();
      unsubSettings();
      unsubActivity();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const lowBalanceUsers = Object.keys(wallets).filter(uid => {
    const bal = wallets[uid]?.balance || 0;
    return bal < minBalance;
  });

  const handleClearNotifications = async () => {
    try {
      await set(ref(db, 'LiveActivity'), null);
      setLiveActivities([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('seu_admin_logged');
    router.push('/login');
  };

  const totalNotificationsCount = lowBalanceUsers.length + liveActivities.length;

  return (
    <header className="h-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between relative">
      
      {/* Left: Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-3 z-10">
        <button 
          onClick={onMenuClick}
        className="md:hidden text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 border border-slate-700/50"
        >
          <Menu size={20} />
        </button>

        <div className="relative hidden md:block w-64">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Global search..." 
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            readOnly
          />
        </div>
      </div>

      {/* Center: logo.PNG Image positioned absolutely in the middle (ONLY FOR MOBILE VIEW, LARGER SIZE) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center md:hidden">
        <div className="relative w-28 h-12 flex items-center justify-center">
          <Image 
            src="/logo.PNG" 
            alt="SEU Parking Logo" 
            fill 
            className="object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-125"
            priority
          />
        </div>
      </div>

      {/* Right: Notifications & Profile Dropdown */}
      <div className="flex items-center gap-3 z-10">
        
        {/* Notification Bell Button */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-all relative shadow-sm"
          >
            <Bell size={20} />
            {totalNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                {totalNotificationsCount > 9 ? '9+' : totalNotificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-80 md:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950/80 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-cyan-400" />
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">System Notifications</h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {totalNotificationsCount > 0 && (
                      <button 
                        onClick={handleClearNotifications}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg transition-colors"
                        title="Clear All Live Activities"
                      >
                        <Trash2 size={12} /> Clear All
                      </button>
                    )}
                    <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      {totalNotificationsCount} New
                    </span>
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 text-xs custom-scrollbar">
                  
                  {lowBalanceUsers.length > 0 && (
                    <div className="p-3 bg-rose-950/20">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> Low Wallet Balances ({lowBalanceUsers.length})
                      </p>
                      <div className="space-y-2">
                        {lowBalanceUsers.map(uid => {
                          const user = users[uid] || { name: 'Unknown User' };
                          const bal = wallets[uid]?.balance || 0;
                          return (
                            <div key={uid} className="bg-slate-950/90 border border-rose-500/30 p-2.5 rounded-xl flex items-center justify-between">
                              <div>
                                <p className="text-white font-bold">{user.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">UID: {uid}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-rose-400 font-mono font-bold">৳{bal}</span>
                                <p className="text-[9px] text-slate-500">Min: ৳{minBalance}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Car size={12} /> Recent Gate Activities
                    </p>
                    {liveActivities.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">No recent activity logs.</p>
                    ) : (
                      <div className="space-y-2">
                        {liveActivities.map((act, idx) => (
                          <div key={idx} className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-slate-200 font-semibold">{act.UserName || "User Scan"}</p>
                              <p className="text-[10px] text-cyan-300 font-mono">{act.AccessStatus || "Activity"}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{act.ScanTime || "Just now"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Close Panel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Admin Profile & Dropdown */}
        <div className="relative pl-2 border-l border-slate-800" ref={profileRef}>
          <button
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs shadow-inner">
              NH
            </div>
            <div className="hidden lg:block text-left pr-1">
              <h4 className="text-white text-xs font-bold">Nazrul Huda</h4>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Online
              </p>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          <AnimatePresence>
            {isProfileDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-14 w-60 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl p-2"
              >
                <div className="p-3 border-b border-slate-800 mb-1">
                  <p className="text-white font-bold text-xs">Nazrul Huda</p>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={12} /> Administrator
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 bg-slate-800/40 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Status: Active Session
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                  >
                    <LogOut size={16} /> Logout System
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
}