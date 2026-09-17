'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../lib/firebase';
import { PieChart, TrendingUp, Car, CheckCircle2, XCircle, Activity, BarChart3, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const [availableSlots, setAvailableSlots] = useState<number>(3);
  const [slots, setSlots] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [systemStatus, setSystemStatus] = useState<string>('Offline');
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch real telemetry and hardware status from Firebase
  useEffect(() => {
    const unsubAvail = onValue(ref(db, 'System/AvailableSlots'), (snapshot) => {
      if (snapshot.exists()) setAvailableSlots(snapshot.val());
    });

    const unsubSlots = onValue(ref(db, 'ParkingSlots'), (snapshot) => {
      if (snapshot.exists()) setSlots(snapshot.val());
    });

    const unsubUsers = onValue(ref(db, 'AuthorizedCards'), (snapshot) => {
      if (snapshot.exists()) {
        setTotalUsers(Object.keys(snapshot.val()).length);
      } else {
        setTotalUsers(0);
      }
    });

    // Real-time hardware status tracking
    const unsubStatus = onValue(ref(db, 'System/Status'), (snapshot) => {
      if (snapshot.exists()) {
        setSystemStatus(snapshot.val());
      } else {
        setSystemStatus('Offline');
      }
    });

    const unsubEntryLogs = onValue(ref(db, 'Logs/Entry'), (snapshotEntry) => {
      const entryCount = snapshotEntry.exists() ? Object.keys(snapshotEntry.val()).length : 0;
      
      const unsubExitLogs = onValue(ref(db, 'Logs/Exit'), (snapshotExit) => {
        const exitCount = snapshotExit.exists() ? Object.keys(snapshotExit.val()).length : 0;
        setTotalLogsCount(entryCount + exitCount);
        setLoading(false);
      });
    });

    return () => {
      unsubAvail();
      unsubSlots();
      unsubUsers();
      unsubStatus();
    };
  }, []);

  const occupiedSlots = 3 - availableSlots;
  const occupancyRate = Math.round((occupiedSlots / 3) * 100);
  const isHardwareOnline = systemStatus === 'Online';

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">System Reports & Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time performance metrics, hardware telemetry, and cloud operational audit data.</p>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-cyan-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Occupancy Efficiency</p>
            <p className="text-3xl font-bold text-cyan-400 mt-1">{occupancyRate}%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><TrendingUp size={24} /></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Total Registered Users</p>
            <p className="text-3xl font-bold text-white mt-1">{totalUsers}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Car size={24} /></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Available Bays</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{availableSlots} / 3</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 size={24} /></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Total Audit Events</p>
            <p className="text-3xl font-bold text-purple-400 mt-1">{totalLogsCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400"><Activity size={24} /></div>
        </div>
      </div>

      {/* Detailed Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Slot Utilization Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <BarChart3 className="text-cyan-400" size={20} /> Bay Utilization Breakdown
            </h3>
            <p className="text-xs text-slate-400 mb-6">Real-time status distribution across all 3 hardware slots.</p>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((num) => {
              const isOcc = slots[`Slot${num}`] === 1;
              return (
                <div key={num} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg font-mono font-bold flex items-center justify-center text-xs ${isOcc ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      0{num}
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-semibold">Parking Bay 0{num}</h4>
                      <p className="text-[11px] text-slate-400">Sensor status: {isOcc ? 'Active Occupied' : 'Standby Available'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${isOcc ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                    {isOcc ? 'Occupied' : 'Available'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Hardware Infrastructure Status */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <ShieldCheck className={isHardwareOnline ? "text-emerald-400" : "text-rose-400"} size={20} /> Hardware Infrastructure Status
            </h3>
            <p className="text-xs text-slate-400 mb-6">Live ESP32 node connection telemetry and operational health.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isHardwareOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                  {isHardwareOnline ? <Activity size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <h4 className="text-white text-sm font-semibold">ESP32 Hardware Node</h4>
                  <p className="text-[11px] text-slate-400">
                    {isHardwareOnline ? 'Actively communicating with Firebase' : 'Device is offline or disconnected'}
                  </p>
                </div>
              </div>
              <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold border ${isHardwareOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isHardwareOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                {systemStatus}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-white text-sm font-semibold">NTP Clock Sync</h4>
                  <p className="text-[11px] text-slate-400">Standard timezone offset active (+6.00)</p>
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full font-semibold">
                {isHardwareOnline ? 'Synced' : 'N/A (Offline)'}
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Car size={18} />
                </div>
                <div>
                  <h4 className="text-white text-sm font-semibold">Servo Gate Barrier</h4>
                  <p className="text-[11px] text-slate-400">Automatic PWM angle transition mechanism</p>
                </div>
              </div>
              <span className={`text-xs font-mono px-3 py-1 rounded-full font-semibold border ${isHardwareOnline ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-slate-500 bg-slate-800/50 border-slate-700'}`}>
                {isHardwareOnline ? 'Armed' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}