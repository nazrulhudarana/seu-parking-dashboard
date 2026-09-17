'use client';

import { useState, useEffect } from 'react';
import { Tv, Clock, Cpu, Layout, MessageSquare, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import clsx from 'clsx';

export default function LCDWidgetPage() {
  const [selectedMode, setSelectedMode] = useState('sensors_free');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const widgets = [
    { id: 'sensors_free', name: 'Sensor Data & Free Slots', desc: 'Shows individual slot distances and total free slots.', icon: Cpu },
    { id: 'clock_free', name: 'Real-time Clock & Free Slots', desc: 'Shows live system time on top and free slots below.', icon: Clock },
    { id: 'only_free', name: 'Only Free Slots (Simple)', desc: 'Displays system title and large free slot counter.', icon: Layout },
    { id: 'scan_message', name: 'Scan Card Message', desc: 'Displays "Please Scan Card" prompt and available slots.', icon: MessageSquare },
  ];

  useEffect(() => {
    const fetchCurrentMode = async () => {
      try {
        const snapshot = await get(ref(db, 'System/LCDWidgetMode'));
        if (snapshot.exists()) {
          setSelectedMode(snapshot.val());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCurrentMode();
  }, []);

  const handleSelectWidget = async (modeId: string) => {
    setSelectedMode(modeId);
    setLoading(true);
    setSuccessMsg('');

    try {
      await set(ref(db, 'System/LCDWidgetMode'), modeId);
      setSuccessMsg('LCD Widget updated successfully! ESP32 will reflect changes.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to update LCD mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <Tv className="text-cyan-400" /> LCD Display Widget Controller
        </h2>
        <p className="text-sm text-slate-400 mt-1">Select what information your ESP32 I2C LCD displays during idle mode.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {widgets.map((w: { id: string; name: string; desc: string; icon: any }) => {
          const Icon = w.icon;
          const isSelected = selectedMode === w.id;

          return (
            <motion.div
              key={w.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleSelectWidget(w.id)}
              className={clsx(
                "p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4",
                isSelected
                  ? "bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-950/40"
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={clsx("p-3 rounded-xl", isSelected ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-cyan-400")}>
                  <Icon size={22} />
                </div>
                <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", isSelected ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-800 text-slate-400")}>
                  {isSelected ? "Active Widget" : "Select"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">{w.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{w.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}