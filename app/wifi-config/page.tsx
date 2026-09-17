'use client';

import { useState } from 'react';
import { Wifi, Bluetooth, CheckCircle2, AlertTriangle, RefreshCw, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function WifiConfigPage() {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('Ready to connect via Bluetooth.');
  const [isBtConnected, setIsBtConnected] = useState(false);

  const handleConfigureWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssid || !password) {
      alert('Please enter both Wi-Fi SSID and Password.');
      return;
    }

    if (!(navigator as any).bluetooth) {
      alert('Web Bluetooth is not supported by your browser! Please use Google Chrome or Edge.');
      return;
    }

    setStatus('connecting');
    setStatusMsg('Scanning for SEU_Parking_BT device...');

    try {
      const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
      const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ name: 'SEU_Parking_BT' }],
        optionalServices: [SERVICE_UUID]
      });

      setStatusMsg('Connecting to Bluetooth server...');
      const server = await device.gatt?.connect();
      setIsBtConnected(true);

      setStatusMsg('Accessing Wi-Fi service...');
      const service = await server?.getPrimaryService(SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      // Start notifications to listen for ESP32 response
      await characteristic?.startNotifications();
      characteristic?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = new TextDecoder().decode(event.target.value);
        console.log("ESP32 Response:", value);
        
        if (value.startsWith('SUCCESS')) {
          setStatus('success');
          setStatusMsg(`Connected Successfully! IP: ${value.replace('SUCCESS:', '')}`);
        } else if (value.startsWith('ERROR')) {
          setStatus('error');
          setStatusMsg(`Connection Failed: ${value.replace('ERROR:', '')}`);
        }
      });

      // SSID এবং Password পাঠানো
      const credentials = `${ssid}:${password}`;
      const encoder = new TextEncoder();
      
      setStatusMsg('Sending Wi-Fi credentials... Waiting for ESP32 response...');
      await characteristic?.writeValue(encoder.encode(credentials));

    } catch (err: any) {
      console.error(err);
      setIsBtConnected(false);
      setStatus('error');
      setStatusMsg(`Bluetooth error: ${err.message || 'Failed to connect.'}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <Bluetooth className="text-cyan-400" /> IoT Wi-Fi Bluetooth Provisioning
        </h2>
        <p className="text-sm text-slate-400 mt-1">Configure ESP32 Wi-Fi securely and monitor live connection status.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl space-y-6"
      >
        {/* Bluetooth Connection Indicator Badge */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-2">
            <Bluetooth size={16} className={isBtConnected ? "text-cyan-400 animate-pulse" : "text-slate-600"} />
            Bluetooth Link:
          </span>
          <span className={clsx("font-mono font-bold px-2.5 py-1 rounded-full", isBtConnected ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-slate-800 text-slate-500")}>
            {isBtConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <Smartphone className="text-cyan-400 shrink-0" size={28} />
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block mb-0.5">Instructions:</span>
            1. Ensure ESP32 is powered on and broadcasting <code className="text-cyan-300 font-mono">SEU_Parking_BT</code>.<br/>
            2. Enter Wi-Fi Name and Password below and click configure.<br/>
            3. Check ESP32 LCD screen for live connection progress.
          </div>
        </div>

        <form onSubmit={handleConfigureWifi} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Wi-Fi Name (SSID)</label>
            <input 
              type="text" 
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="e.g. Rana" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Wi-Fi Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Wi-Fi password" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              required 
            />
          </div>

          <button 
            type="submit"
            disabled={status === 'connecting'}
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
          >
            {status === 'connecting' ? <RefreshCw className="animate-spin" size={16} /> : <Wifi size={16} />}
            {status === 'connecting' ? 'Configuring via Bluetooth...' : 'Connect & Push Wi-Fi to ESP32'}
          </button>
        </form>

        {/* Status Box */}
        {status !== 'idle' && (
          <div className={clsx("p-4 rounded-xl border text-xs flex items-center gap-3", 
            status === 'connecting' ? "bg-blue-500/10 border-blue-500/30 text-blue-300" :
            status === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
            "bg-rose-500/10 border-rose-500/30 text-rose-300"
          )}>
            {status === 'connecting' && <RefreshCw size={18} className="animate-spin shrink-0" />}
            {status === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
            {status === 'error' && <AlertTriangle size={18} className="shrink-0" />}
            <span className="font-mono">{statusMsg}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}