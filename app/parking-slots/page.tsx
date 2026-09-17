'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../../lib/firebase';
import { Car, CheckCircle2, XCircle, RefreshCw, Power, Plus, Trash2, X, WifiOff, Wifi, User, Phone, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function ParkingSlotsManager() {
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [availableSlots, setAvailableSlots] = useState<number>(3);
  const [activeSessions, setActiveSessions] = useState<Record<string, any>>({});
  const [authorizedCards, setAuthorizedCards] = useState<Record<string, any>>({});
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const slotsRef = ref(db, 'ParkingSlots');
    const unsubSlots = onValue(slotsRef, (snapshot) => {
      if (snapshot.exists()) setSlots(snapshot.val());
      else setSlots({});
    });

    const availRef = ref(db, 'System/AvailableSlots');
    const unsubAvail = onValue(availRef, (snapshot) => {
      if (snapshot.exists()) setAvailableSlots(snapshot.val());
    });

    const sessionsRef = ref(db, 'ActiveSessions');
    const unsubSessions = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) setActiveSessions(snapshot.val());
      else setActiveSessions({});
    });

    const cardsRef = ref(db, 'AuthorizedCards');
    const unsubCards = onValue(cardsRef, (snapshot) => {
      if (snapshot.exists()) setAuthorizedCards(snapshot.val());
      else setAuthorizedCards({});
    });

    return () => {
      unsubSlots();
      unsubAvail();
      unsubSessions();
      unsubCards();
    };
  }, []);

  const handleForceReleaseSlot = async (slotNumber: number) => {
    setLoadingSlot(`Slot${slotNumber}`);
    try {
      let targetUid = null;
      for (const uid of Object.keys(activeSessions)) {
        if (activeSessions[uid].AssignedSlot === slotNumber) {
          targetUid = uid;
          break;
        }
      }

      if (targetUid) {
        await set(ref(db, `ActiveSessions/${targetUid}`), null);
      }

      await set(ref(db, `ParkingSlots/Slot${slotNumber}/status`), 0);
      
      const slotKeys = Object.keys(slots);
      const totalSlotsCount = slotKeys.length || 3;
      let occupied = 0;
      slotKeys.forEach(k => {
        const val = slots[k];
        const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
        if (isOcc) occupied++;
      });
      const newAvailable = Math.max(0, totalSlotsCount - Math.max(0, occupied - 1));
      
      await set(ref(db, 'System/AvailableSlots'), newAvailable);

    } catch (error) {
      console.error("Failed to release slot:", error);
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleDeleteSlot = async (slotKey: string, slotNum: number) => {
    if (!confirm(`Are you sure you want to delete Parking Bay 0${slotNum}?`)) return;

    try {
      await remove(ref(db, `ParkingSlots/${slotKey}`));

      for (const uid of Object.keys(activeSessions)) {
        if (activeSessions[uid].AssignedSlot === slotNum) {
          await remove(ref(db, `ActiveSessions/${uid}`));
          break;
        }
      }

      const remainingSlots = Object.keys(slots).filter(k => k !== slotKey);
      const newTotal = remainingSlots.length;
      let occupied = 0;
      remainingSlots.forEach(k => {
        const val = slots[k];
        const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
        if (isOcc) occupied++;
      });
      const newAvailable = Math.max(0, newTotal - occupied);

      await set(ref(db, 'System/AvailableSlots'), newAvailable);

      setSuccessMsg(`Bay 0${slotNum} deleted successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to delete slot:", err);
    }
  };

  const handleAddNewSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newSlotNumber);
    if (!num || slots[`Slot${num}`] !== undefined) {
      alert("Invalid slot number or slot already exists!");
      return;
    }

    try {
      await set(ref(db, `ParkingSlots/Slot${num}`), {
        status: 0,
        sensorConnected: false 
      });

      const updatedAvailable = availableSlots + 1;
      await set(ref(db, 'System/AvailableSlots'), updatedAvailable);

      setNewSlotNumber('');
      setIsAddModalOpen(false);
      setSuccessMsg(`Bay 0${num} added successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Error adding slot:", err);
    }
  };

  const slotKeys = Object.keys(slots).sort((a, b) => {
    const numA = parseInt(a.replace('Slot', '')) || 0;
    const numB = parseInt(b.replace('Slot', '')) || 0;
    return numA - numB;
  });

  const totalSlotsCount = slotKeys.length > 0 ? slotKeys.length : 3;
  let occupiedCount = 0;
  slotKeys.forEach(k => {
    const val = slots[k];
    const isOcc = typeof val === 'object' && val !== null ? val.status === 1 : val === 1;
    if (isOcc) occupiedCount++;
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Parking Slots Control Panel</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time telemetry, live distance, occupant details & bay management.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 w-fit"
        >
          <Plus size={16} /> Add New Parking Bay
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Total Infrastructure</p>
            <p className="text-3xl font-bold text-white mt-1">{totalSlotsCount} Slots</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Car size={24} /></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Available Bays</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{availableSlots}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400"><CheckCircle2 size={24} /></div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-rose-500 flex items-center justify-between shadow-lg bg-slate-900/60">
          <div>
            <p className="text-sm text-slate-400">Occupied Bays</p>
            <p className="text-3xl font-bold text-rose-400 mt-1">{Math.max(0, occupiedCount)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400"><XCircle size={24} /></div>
        </div>
      </div>

      {/* Slot Grid Cards with Advanced Occupant Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {(slotKeys.length > 0 ? slotKeys : ['Slot1', 'Slot2', 'Slot3']).map((slotKey) => {
          const num = parseInt(slotKey.replace('Slot', '')) || 1;
          const slotVal = slots[slotKey];
          
          const slotStatus = typeof slotVal === 'object' && slotVal !== null ? (slotVal.status || 0) : (slotVal || 0);
          const distance = typeof slotVal === 'object' && slotVal !== null ? slotVal.distance : undefined;

          const isSensorLive = typeof slotVal === 'object' && slotVal !== null 
            ? (slotVal.sensorConnected === true) 
            : (num <= 3); 

          const isOccupied = isSensorLive && slotStatus === 1;
          
          // Match active session and authorized card details (Name, Phone, Vehicle, Color)
          let occupantInfo: any = null;
          let matchedUid = null;
          for (const uid of Object.keys(activeSessions)) {
            if (activeSessions[uid].AssignedSlot === num) {
              matchedUid = uid;
              const cardDetails = authorizedCards[uid] || {};
              occupantInfo = { 
                uid, 
                name: cardDetails.name || activeSessions[uid].Name || "Authorized User",
                phone: cardDetails.phone || activeSessions[uid].phone || "+880 1XXXXXXXXX",
                vehicleNumber: cardDetails.vehicleNumber || "Unknown Vehicle",
                vehicleModel: cardDetails.vehicleModel || "Standard",
                vehicleColour: cardDetails.vehicleColour || "White",
                entryTime: activeSessions[uid].EntryTime || "--"
              };
              break;
            }
          }

          return (
            <motion.div 
              key={slotKey}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: num * 0.1 }}
              className={clsx(
                "glass-panel p-6 rounded-2xl border bg-slate-900/80 relative overflow-hidden flex flex-col justify-between shadow-xl transition-all",
                !isSensorLive ? "border-slate-700/50 opacity-80" : (isOccupied ? "border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]" : "border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]")
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-12 h-12 rounded-xl font-mono font-bold text-lg flex items-center justify-center shadow-inner",
                    !isSensorLive ? "bg-slate-800 text-slate-500 border border-slate-700" : (isOccupied ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40")
                  )}>
                    {num < 10 ? `0${num}` : num}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base">Parking Bay {num < 10 ? `0${num}` : num}</h4>
                    <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      {isSensorLive ? <Wifi size={10} className="text-emerald-400" /> : <WifiOff size={10} className="text-rose-400" />}
                      {isSensorLive ? "SENSOR CONNECTED" : "SENSOR DISCONNECTED"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSlot(slotKey, num)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all"
                  title="Delete Bay"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Telemetry & Occupant Information Card */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 my-3 space-y-2.5">
                
                {/* Live Distance Telemetry Box */}
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Ultrasonic Distance:</span>
                  <span className={clsx("font-mono font-bold", isSensorLive && distance !== undefined ? "text-cyan-300" : "text-slate-600")}>
                    {isSensorLive && distance !== undefined ? `${distance} cm` : "-- cm"}
                  </span>
                </div>

                {!isSensorLive ? (
                  <div className="text-center py-4 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <WifiOff size={14} /> No Physical Sensor Assigned
                  </div>
                ) : isOccupied && occupantInfo ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1"><User size={12} className="text-cyan-400" /> Holder:</span>
                      <span className="text-white font-bold">{occupantInfo.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1"><Phone size={12} className="text-emerald-400" /> Phone:</span>
                      <span className="text-slate-300 font-mono">{occupantInfo.phone}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1"><Car size={12} className="text-blue-400" /> Vehicle:</span>
                      <span className="text-cyan-300 font-mono font-semibold">{occupantInfo.vehicleNumber}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-2">
                      <span className="text-slate-400">Model / Color:</span>
                      <span className="text-slate-300">{occupantInfo.vehicleModel} ({occupantInfo.vehicleColour})</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Entry Time:</span>
                      <span className="text-cyan-400 font-mono font-bold">{occupantInfo.entryTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    Bay is empty & ready for parking.
                  </div>
                )}
              </div>

              <div className="pt-2">
                {isSensorLive && isOccupied ? (
                  <button 
                    onClick={() => handleForceReleaseSlot(num)}
                    disabled={loadingSlot === slotKey}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loadingSlot === slotKey ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Power size={14} />
                    )}
                    Force Release Bay
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-500 font-semibold text-xs text-center uppercase tracking-wider">
                    {isSensorLive ? "Standby Mode" : "Sensor Offline"}
                  </div>
                )}
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* Modal for Adding New Slot */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-sm bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 relative shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <h3 className="text-white font-bold text-base">Add New Parking Bay</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddNewSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Slot Number</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 4" 
                    value={newSlotNumber}
                    onChange={(e) => setNewSlotNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                    required 
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="w-1/2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs uppercase shadow-lg shadow-cyan-500/20"
                  >
                    Create Bay
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}