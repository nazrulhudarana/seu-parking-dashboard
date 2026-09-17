'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, CheckCircle, CarFront, ShieldCheck } from 'lucide-react';

export default function RfidAnimationPanel() {
  // Animation Steps: 0=Idle, 1=Approach, 2=Scanning, 3=Auth Success, 4=Gate Open, 5=Moving, 6=Parked
  const [step, setStep] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [assignedSlot, setAssignedSlot] = useState<number>(0);

  // Helper function for delays
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    const activityRef = ref(db, 'LiveActivity');
    
    const unsubscribe = onValue(activityRef, async (snapshot) => {
      const data = snapshot.val();
      
      // Jodi notun Entry hoy
      if (data && data.AccessStatus === "Granted - Entry") {
        // Fetch User Info from recent Logs (Example logic)
        setUserName(data.UserName || "Valid User");
        setAssignedSlot(data.Slot || Math.floor(Math.random() * 3) + 1); // Get slot from DB in real scenario

        // 🟢 THE 12-STEP ANIMATION SEQUENCE 🟢
        
        // 1. Vehicle approaches the entrance
        setStep(1); 
        await sleep(1000);
        
        // 2. RFID scanner animation appears
        setStep(2); 
        await sleep(1200);
        
        // 3. Card authentication succeeds
        setStep(3); 
        await sleep(1000);
        
        // 4. Gate barrier opens
        setStep(4); 
        await sleep(800);
        
        // 5 & 6 & 7. Car moving & assigning slot
        setStep(5); 
        await sleep(1500);
        
        // 8 & 9 & 10 & 11. Detected, Slot turns RED, Parking Successful
        setStep(6); 
        
        // Reset back to idle after 4 seconds
        setTimeout(() => setStep(0), 4000);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 relative overflow-hidden h-72 flex flex-col justify-center items-center text-center shadow-xl">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-900 to-black"></div>

      <AnimatePresence mode="wait">
        
        {/* State 0: IDLE */}
        {step === 0 && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="z-10">
            <Wifi size={48} className="text-slate-500 mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-semibold text-slate-300">Waiting for RFID Card</h3>
            <p className="text-slate-500 text-sm mt-2">Please tap your card at the entrance gate.</p>
          </motion.div>
        )}

        {/* State 1 & 2: APPROACH & SCANNING */}
        {(step === 1 || step === 2) && (
          <motion.div key="scanning" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }} className="z-10">
            <div className="relative">
              <CarFront size={48} className="text-cyan-400 mx-auto mb-4" />
              {step === 2 && (
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1.5 }} className="absolute -top-2 -right-2">
                  <Wifi size={24} className="text-blue-500 animate-ping" />
                </motion.div>
              )}
            </div>
            <h3 className="text-xl font-bold text-cyan-400">
              {step === 1 ? "Vehicle Approaching..." : "Scanning RFID..."}
            </h3>
          </motion.div>
        )}

        {/* State 3: AUTHENTICATION SUCCESS */}
        {step === 3 && (
          <motion.div key="success" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="z-10">
            <ShieldCheck size={56} className="text-emerald-400 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
            <h3 className="text-2xl font-bold text-emerald-400">ACCESS GRANTED</h3>
            <p className="text-slate-300 mt-2">Welcome, {userName}</p>
          </motion.div>
        )}

        {/* State 4 & 5: GATE OPENING & MOVING */}
        {(step === 4 || step === 5) && (
          <motion.div key="moving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="z-10 w-full px-8">
            <h3 className="text-lg font-bold text-blue-400 mb-6">
              {step === 4 ? "Opening Gate Barrier..." : `Assigning Slot ${assignedSlot}...`}
            </h3>
            {/* Simple Gate & Car Animation */}
            <div className="relative h-12 border-b-2 border-slate-600 w-full">
              {/* Barrier */}
              <motion.div 
                initial={{ rotate: 0 }} 
                animate={{ rotate: step >= 4 ? -90 : 0 }} 
                transition={{ duration: 0.5 }}
                className="absolute right-10 bottom-0 w-24 h-2 bg-gradient-to-r from-red-500 to-white origin-right z-20"
              />
              {/* Car */}
              <motion.div 
                initial={{ x: -100 }} 
                animate={{ x: step === 5 ? 200 : 0 }} 
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute bottom-1 left-0 z-10"
              >
                <CarFront size={32} className="text-white drop-shadow-md" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* State 6: PARKED & LOG CREATED */}
        {step === 6 && (
          <motion.div key="parked" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="z-10">
            <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <CheckCircle size={40} className="text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-wide">Parking Successful</h3>
            <div className="flex justify-center gap-4 mt-3">
              <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-sm border border-slate-600">Slot: {assignedSlot}</span>
              <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-sm border border-slate-600">Log Created</span>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}