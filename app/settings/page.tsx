'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../lib/firebase';
import { Settings, Sliders, Shield, Wifi, Cpu, Save, CheckCircle2, Power, RefreshCw, Clock, CreditCard, AlertTriangle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function SettingsPage() {
  const [cardRegMode, setCardRegMode] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<string>('Online');
  const [saving, setSaving] = useState<boolean>(false);
  const [savingHardware, setSavingHardware] = useState<boolean>(false);
  const [savingSmtp, setSavingSmtp] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [manualTime, setManualTime] = useState<string>('');

  // bKash Gateway Credentials States
  const [bkashConfig, setBkashConfig] = useState({
    isSandbox: true,
    appKey: '',
    appSecret: '',
    username: '',
    password: ''
  });

  // Hardware & Gate Parameters States
  const [hardwareConfig, setHardwareConfig] = useState({
    gateOpenDuration: 3,
    ultrasonicThreshold: 15,
    ntpTimezoneOffset: 21600
  });

  // SMTP Email Configuration States
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: ''
  });

  useEffect(() => {
    const unsubReg = onValue(ref(db, 'System/CardRegistrationMode'), (s) => s.exists() && setCardRegMode(s.val()));
    const unsubStatus = onValue(ref(db, 'System/Status'), (s) => s.exists() && setSystemStatus(s.val()));
    
    const unsubBkash = onValue(ref(db, 'BillingSettings'), (s) => {
      if (s.exists()) {
        const val = s.val();
        setBkashConfig({
          isSandbox: val.isSandbox ?? true,
          appKey: val.bkashAppKey || '',
          appSecret: val.bkashAppSecret || '',
          username: val.bkashUsername || '',
          password: val.bkashPassword || ''
        });
      }
    });

    const unsubHardware = onValue(ref(db, 'HardwareConfig'), (s) => {
      if (s.exists()) {
        const val = s.val();
        setHardwareConfig({
          gateOpenDuration: val.gateOpenDuration ?? 3,
          ultrasonicThreshold: val.ultrasonicThreshold ?? 15,
          ntpTimezoneOffset: val.ntpTimezoneOffset ?? 21600
        });
      }
    });

    const unsubSmtp = onValue(ref(db, 'SMTPConfig'), (s) => {
      if (s.exists()) {
        setSmtpConfig(s.val());
      }
    });

    const now = new Date();
    setManualTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));

    return () => { unsubReg(); unsubStatus(); unsubBkash(); unsubHardware(); unsubSmtp(); };
  }, []);

  const handleToggleRegMode = async (val: boolean) => {
    setCardRegMode(val);
    await set(ref(db, 'System/CardRegistrationMode'), val);
  };

  const handleToggleSystemStatus = async (status: string) => {
    setSystemStatus(status);
    await set(ref(db, 'System/Status'), status);
    setMessage({ text: `System status updated to ${status}!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSyncTime = async () => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      await set(ref(db, 'System/ManualSyncTime'), timeStr);
      setMessage({ text: `Time successfully synced: ${timeStr}`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBkashConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!bkashConfig.appKey || !bkashConfig.appSecret || !bkashConfig.username || !bkashConfig.password) {
      setSaving(false);
      setMessage({ text: 'bKash API Error: All merchant fields must be filled correctly.', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/bkash/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bkashConfig)
      });

      const result = await res.json();
      setSaving(false);

      if (result.success) {
        await set(ref(db, 'BillingSettings/isSandbox'), bkashConfig.isSandbox);
        await set(ref(db, 'BillingSettings/bkashAppKey'), bkashConfig.appKey);
        await set(ref(db, 'BillingSettings/bkashAppSecret'), bkashConfig.appSecret);
        await set(ref(db, 'BillingSettings/bkashUsername'), bkashConfig.username);
        await set(ref(db, 'BillingSettings/bkashPassword'), bkashConfig.password);

        setMessage({ text: result.message, type: 'success' });
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    } catch (err) {
      setSaving(false);
      setMessage({ text: 'Failed to connect to bKash API route.', type: 'error' });
    }
  };

  const handleSaveHardwareConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHardware(true);
    setMessage(null);

    try {
      await set(ref(db, 'HardwareConfig'), hardwareConfig);
      setSavingHardware(false);
      setMessage({ text: `Hardware parameters successfully saved! Gate open duration set to ${hardwareConfig.gateOpenDuration}s.`, type: 'success' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setSavingHardware(false);
      setMessage({ text: 'Failed to save hardware parameters to database.', type: 'error' });
    }
  };

  const handleSaveSmtpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    setMessage(null);

    try {
      await set(ref(db, 'SMTPConfig'), smtpConfig);
      setSavingSmtp(false);
      setMessage({ text: 'SMTP Email settings successfully saved to database!', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setSavingSmtp(false);
      setMessage({ text: 'Failed to save SMTP configuration.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">System & Gateway Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Configure hardware preferences, gate timers, bKash credentials, and SMTP email notifications.</p>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={clsx("p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg", message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400")}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* bKash Gateway Connection Panel */}
        <form onSubmit={handleSaveBkashConfig} className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <CreditCard className="text-pink-500" size={20} /> bKash API & Merchant Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">bKash Environment</label>
              <select 
                value={bkashConfig.isSandbox ? 'sandbox' : 'live'}
                onChange={(e) => setBkashConfig({...bkashConfig, isSandbox: e.target.value === 'sandbox'})}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-pink-500"
              >
                <option value="sandbox">Sandbox (Test Mode)</option>
                <option value="live">Live Production (Real Money)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Merchant Username</label>
              <input 
                type="text" 
                value={bkashConfig.username}
                onChange={(e) => setBkashConfig({...bkashConfig, username: e.target.value})}
                placeholder="e.g. sandboxTokenizedUser02" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-pink-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Merchant Password</label>
              <input 
                type="password" 
                value={bkashConfig.password}
                onChange={(e) => setBkashConfig({...bkashConfig, password: e.target.value})}
                placeholder="bKash API Password" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-pink-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">App Key (API Key)</label>
              <input 
                type="text" 
                value={bkashConfig.appKey}
                onChange={(e) => setBkashConfig({...bkashConfig, appKey: e.target.value})}
                placeholder="bKash App Key" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-pink-500" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">App Secret</label>
              <input 
                type="password" 
                value={bkashConfig.appSecret}
                onChange={(e) => setBkashConfig({...bkashConfig, appSecret: e.target.value})}
                placeholder="bKash App Secret" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-pink-500" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Verifying with bKash API...' : 'Authenticate & Connect bKash Gateway'}
            </button>
          </div>
        </form>

        {/* SMTP Email Configuration Panel */}
        <form onSubmit={handleSaveSmtpConfig} className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-5 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Mail className="text-cyan-400" size={20} /> SMTP Email Configuration (For PDF Invoices)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">SMTP Host</label>
              <input 
                type="text" 
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                placeholder="smtp.gmail.com" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-cyan-500" 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">SMTP Port</label>
              <input 
                type="number" 
                value={smtpConfig.port}
                onChange={(e) => setSmtpConfig({...smtpConfig, port: Number(e.target.value)})}
                placeholder="587" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-cyan-500" 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Sender Email (User)</label>
              <input 
                type="email" 
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                placeholder="your_email@gmail.com" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-cyan-500" 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email App Password</label>
              <input 
                type="password" 
                value={smtpConfig.pass}
                onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                placeholder="Gmail App Password" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-cyan-500" 
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={savingSmtp}
              className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {savingSmtp ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {savingSmtp ? 'Saving SMTP Config...' : 'Save SMTP Settings to Database'}
            </button>
          </div>
        </form>

        {/* Operational Modes Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Sliders className="text-cyan-400" size={20} /> Operational Modes
          </h3>

          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-white text-sm font-semibold">Card Registration Mode</h4>
              <p className="text-xs text-slate-400 mt-0.5">Enable continuous hardware scanning to capture new card UIDs.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleRegMode(!cardRegMode)}
              className={clsx("w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300", cardRegMode ? "bg-cyan-500" : "bg-slate-800")}
            >
              <div className={clsx("bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300", cardRegMode ? "translate-x-6" : "translate-x-0")} />
            </button>
          </div>

          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-white text-sm font-semibold">System Power Status</h4>
              <p className="text-xs text-slate-400 mt-0.5">Set system state to Online or Maintenance mode.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSystemStatus(systemStatus === 'Online' ? 'Maintenance' : 'Online')}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md",
                systemStatus === 'Online' ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400" : "bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse"
              )}
            >
              <Power size={14} /> {systemStatus}
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
            <div>
              <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                <Clock size={16} className="text-cyan-400" /> Manual Time Sync
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Push browser system time to ESP32 instantly if NTP fails.</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="text" value={manualTime} readOnly className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-cyan-300 text-xs font-mono" />
              <button type="button" onClick={handleSyncTime} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shrink-0 flex items-center gap-1.5">
                <RefreshCw size={14} /> Sync
              </button>
            </div>
          </div>
        </div>

        {/* Hardware & Barrier Configurations */}
        <form onSubmit={handleSaveHardwareConfig} className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Cpu className="text-emerald-400" size={20} /> Hardware & Gate Parameters
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Gate Open Duration (Seconds)</label>
            <input 
              type="number" 
              value={hardwareConfig.gateOpenDuration} 
              onChange={e => setHardwareConfig({...hardwareConfig, gateOpenDuration: Number(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500" 
              required 
            />
            <p className="text-[10px] text-slate-500 mt-1">If set to 10s, the gate will remain open for exactly 10 seconds.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Ultrasonic Occupancy Threshold (cm)</label>
            <input 
              type="number" 
              value={hardwareConfig.ultrasonicThreshold} 
              onChange={e => setHardwareConfig({...hardwareConfig, ultrasonicThreshold: Number(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NTP Timezone Offset (Seconds)</label>
            <input 
              type="number" 
              value={hardwareConfig.ntpTimezoneOffset} 
              onChange={e => setHardwareConfig({...hardwareConfig, ntpTimezoneOffset: Number(e.target.value)})}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500" 
              required 
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={savingHardware}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {savingHardware ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {savingHardware ? 'Saving Hardware Config...' : 'Save Hardware Parameters'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}