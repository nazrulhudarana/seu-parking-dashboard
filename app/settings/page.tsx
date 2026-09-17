'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { Settings, Sliders, Shield, Wifi, Cpu, Save, CheckCircle2, Power, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function SettingsPage() {
  const [cardRegMode, setCardRegMode] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<string>('Online');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const regModeRef = ref(db, 'System/CardRegistrationMode');
    const unsubReg = onValue(regModeRef, (snapshot) => {
      if (snapshot.exists()) setCardRegMode(snapshot.val());
    });

    const statusRef = ref(db, 'System/Status');
    const unsubStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) setSystemStatus(snapshot.val());
    });

    return () => {
      unsubReg();
      unsubStatus();
    };
  }, []);

  const handleToggleRegMode = async (val: boolean) => {
    setCardRegMode(val);
    await set(ref(db, 'System/CardRegistrationMode'), val);
  };

  const handleToggleSystemStatus = async (status: string) => {
    setSystemStatus(status);
    await set(ref(db, 'System/Status'), status);
    setSuccessMessage(`System status updated to ${status}!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccessMessage('System configurations saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">System Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure hardware preferences, operational modes, and cloud synchronization parameters.</p>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-lg"
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Operational Modes Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Sliders className="text-cyan-400" size={20} /> Operational Modes
          </h3>

          {/* Card Registration Mode Toggle */}
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-white text-sm font-semibold">Card Registration Mode</h4>
              <p className="text-xs text-slate-400 mt-0.5">Enable continuous hardware scanning to capture new card UIDs.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleRegMode(!cardRegMode)}
              className={clsx(
                "w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300",
                cardRegMode ? "bg-cyan-500" : "bg-slate-800"
              )}
            >
              <div className={clsx(
                "bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300",
                cardRegMode ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* System Status Toggle (Online / Maintenance) */}
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-white text-sm font-semibold">System Power Status</h4>
              <p className="text-xs text-slate-400 mt-0.5">Set system state to Online or Maintenance mode.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleSystemStatus(systemStatus === 'Online' ? 'Maintenance' : 'Online')}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md",
                  systemStatus === 'Online' 
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" 
                    : "bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse"
                )}
              >
                <Power size={14} /> {systemStatus}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/60 p-4 rounded-xl">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Firebase Database Host</label>
            <input 
              type="text" 
              value="seu-parking-default-rtdb.firebaseio.com" 
              disabled 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-400 text-xs font-mono cursor-not-allowed" 
            />
          </div>
        </div>

        {/* Hardware & Barrier Configurations */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Cpu className="text-emerald-400" size={20} /> Hardware & Gate Parameters
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Gate Open Duration (Seconds)</label>
            <input 
              type="number" 
              defaultValue={3} 
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Ultrasonic Occupancy Threshold (cm)</label>
            <input 
              type="number" 
              defaultValue={15} 
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NTP Timezone Offset (Seconds)</label>
            <input 
              type="number" 
              defaultValue={21600} 
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all" 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Save Configurations
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}