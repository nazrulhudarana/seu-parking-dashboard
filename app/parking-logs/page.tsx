'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../lib/firebase';
import { FileText, Search, User, Calendar, X } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ParkingSessionLog {
  id: string;
  uid: string;
  name: string;
  slot: number;
  entryTime: string;
  exitTime: string;
  duration: string;
  fee: number;
  status: string;
  rawTime: number;
  rawDate: string;
}

export default function ParkingLogs() {
  const [logs, setLogs] = useState<ParkingSessionLog[]>([]);
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    // ফায়ারবেস থেকে সবগুলোর ডেটা ফেচ করা হচ্ছে
    const entryRef = ref(db, 'Logs/Entry');
    const exitRef = ref(db, 'Logs/Exit');
    const receiptsRef = ref(db, 'Receipts');
    const activeRef = ref(db, 'ActiveSessions');

    let entryData: Record<string, any> = {};
    let exitData: Record<string, any> = {};
    let receiptsData: Record<string, any> = {};
    let activeData: Record<string, any> = {};

    const parseTimeToMs = (timeStr: string) => {
      try {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes, seconds] = time.split(':');
        let hrs = parseInt(hours, 10);
        if (hrs === 12 && modifier === 'AM') hrs = 0;
        if (modifier === 'PM' && hrs < 12) hrs += 12;
        const d = new Date();
        d.setHours(hrs, parseInt(minutes, 10), parseInt(seconds || "0", 10));
        return d.getTime();
      } catch {
        return 0;
      }
    };

    const extractDateString = (timestampVal: any) => {
      try {
        const d = typeof timestampVal === 'number' ? new Date(timestampVal) : new Date();
        return d.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    };

    const updateLogs = () => {
      const sessionMap: Record<string, any> = {};

      // ১. সমস্ত এন্ট্রি লগ প্রসেস করা হচ্ছে (ইউনিক আইডির মাধ্যমে যাতে ওভাররাইট না হয়)
      Object.keys(entryData).forEach((key) => {
        const item = entryData[key];
        const uid = key.split('_')[0];
        const timestampPart = parseInt(key.split('_')[1] || Date.now().toString(), 10);
        
        sessionMap[key] = {
          id: key,
          uid: uid,
          name: item.Name || 'Authorized User',
          slot: item.AssignedSlot || 1,
          entryTime: item.Time || 'N/A',
          exitTime: 'Parked (Active)',
          duration: 'Ongoing',
          fee: 0,
          status: 'Active',
          rawTime: parseTimeToMs(item.Time || '12:00:00 AM'),
          rawDate: extractDateString(isNaN(timestampPart) ? Date.now() : timestampPart)
        };
      });

      // ২. একই ইউজারের লগগুলোকে আলাদা করা
      const entriesByUid: Record<string, string[]> = {};
      Object.keys(sessionMap).forEach(key => {
          const uid = sessionMap[key].uid;
          if (!entriesByUid[uid]) entriesByUid[uid] = [];
          entriesByUid[uid].push(key);
      });

      // ৩. ActiveSession এর সাথে মিলিয়ে স্ট্যাটাস আপডেট করা
      Object.keys(entriesByUid).forEach(uid => {
          // লেটেস্ট এন্ট্রিগুলো আগে সাজানো
          entriesByUid[uid].sort((a, b) => sessionMap[b].rawTime - sessionMap[a].rawTime);
          
          const isCurrentlyActive = activeData[uid] !== undefined;
          
          entriesByUid[uid].forEach((entryKey, index) => {
              if (index === 0 && isCurrentlyActive) {
                  sessionMap[entryKey].status = 'Active';
                  sessionMap[entryKey].exitTime = 'Parked (Active)';
              } else {
                  sessionMap[entryKey].status = 'Completed';
                  sessionMap[entryKey].exitTime = 'Left'; 
                  sessionMap[entryKey].duration = 'Ended';
                  
                  // এক্সিট ডেটা থেকে এক্সিট টাইম ম্যাচ করানো
                  if (exitData[uid] && exitData[uid].EntryTime === sessionMap[entryKey].entryTime) {
                      sessionMap[entryKey].exitTime = exitData[uid].ExitTime;
                  }
              }
          });
      });

      // ৪. রিসিপ্টগুলো ম্যাচ করানো (নতুন রিসিপ্টগুলো আগে)
      const sortedReceipts = Object.keys(receiptsData).map(k => ({id: k, ...receiptsData[k]})).sort((a, b) => {
          const timeA = parseInt(a.id.replace('PM-', ''), 10) || 0;
          const timeB = parseInt(b.id.replace('PM-', ''), 10) || 0;
          return timeB - timeA;
      });

      const receiptsByUid: Record<string, any[]> = {};
      sortedReceipts.forEach(r => {
          if (!receiptsByUid[r.uid]) receiptsByUid[r.uid] = [];
          receiptsByUid[r.uid].push(r);
      });

      Object.keys(entriesByUid).forEach(uid => {
          let receiptIndex = 0;
          entriesByUid[uid].forEach((entryKey) => {
              if (sessionMap[entryKey].status === 'Completed') {
                  if (receiptsByUid[uid] && receiptsByUid[uid][receiptIndex]) {
                      const rec = receiptsByUid[uid][receiptIndex];
                      sessionMap[entryKey].fee = rec.fee || 0;
                      sessionMap[entryKey].duration = rec.duration || 'N/A';
                      receiptIndex++;
                  }
              }
          });
      });

      // সব ডেটা একসাথে করে ড্যাশবোর্ডে পাঠানো
      const combined: ParkingSessionLog[] = Object.values(sessionMap);
      combined.sort((a, b) => b.rawTime - a.rawTime);
      setLogs(combined);
    };

    const unsubEntry = onValue(entryRef, (s) => { entryData = s.exists() ? s.val() : {}; updateLogs(); });
    const unsubExit = onValue(exitRef, (s) => { exitData = s.exists() ? s.val() : {}; updateLogs(); });
    const unsubReceipts = onValue(receiptsRef, (s) => { receiptsData = s.exists() ? s.val() : {}; updateLogs(); });
    const unsubActive = onValue(activeRef, (s) => { activeData = s.exists() ? s.val() : {}; updateLogs(); });

    return () => {
      unsubEntry();
      unsubExit();
      unsubReceipts();
      unsubActive();
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'All' || log.status === filter;
    const matchesSearch = 
      log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.slot.toString().includes(searchTerm);
    
    const matchesDate = !selectedDate || log.rawDate === selectedDate;

    return matchesFilter && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Complete Parking & Billing Logs</h2>
        <p className="text-sm text-slate-400 mt-1">Detailed audit trail showing entry, exit, slot assignment, duration and billed fees with day-wise filtering.</p>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-700/50 bg-slate-900/80 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {(['All', 'Active', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={clsx(
                "px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex-1 lg:flex-none",
                filter === tab 
                  ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold" 
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/70"
              )}
            >
              {tab} Sessions
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto flex items-center bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white">
            <Calendar size={15} className="text-cyan-400 mr-2 shrink-0" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none font-mono cursor-pointer"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')} 
                className="ml-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Clear Date Filter"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search name, UID, slot..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Card Holder</th>
                <th className="py-3.5 px-4">Slot</th>
                <th className="py-3.5 px-4">Entry Time</th>
                <th className="py-3.5 px-4">Exit Time</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Billed Fee</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText size={40} className="mx-auto mb-2 opacity-30" />
                    No parking session logs found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                          <User size={14} />
                        </div>
                        <div>
                          <p>{log.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.uid}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="bg-slate-800 border border-slate-700 text-white font-mono text-xs px-2.5 py-1 rounded-lg">
                        Bay 0{log.slot}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-emerald-400">
                      {log.entryTime}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-rose-400">
                      {log.exitTime}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-cyan-300">
                      {log.duration}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-white">
                      {log.fee > 0 ? `৳${log.fee}` : '—'}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        log.status === 'Completed' 
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
                          : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 animate-pulse"
                      )}>
                        {log.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}