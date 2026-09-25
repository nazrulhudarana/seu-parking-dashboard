'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { db } from '../../lib/firebase';
import { CreditCard, Plus, Trash2, Shield, Wifi, AlertCircle, Phone, Mail } from 'lucide-react';
import clsx from 'clsx';

interface CardUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColour: string;
  status: string;
  registeredDate: string;
}

export default function CardManagement() {
  const [cards, setCards] = useState<CardUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [uid, setUid] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColour, setVehicleColour] = useState('White');
  const [isScanning, setIsScanning] = useState(false);
  const [existingUserNotice, setExistingUserNotice] = useState<string | null>(null);

  const lastProcessedScan = useRef<string>('');

  useEffect(() => {
    const cardsRef = ref(db, 'AuthorizedCards');
    const unsubscribe = onValue(cardsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const cardList = Object.keys(data).map((key) => ({
          uid: key,
          ...data[key],
        }));
        setCards(cardList);
      } else {
        setCards([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    const activityRef = ref(db, 'LiveActivity');
    const unsubscribe = onValue(activityRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.LastScanUID) {
        const scannedUID = data.LastScanUID;

        if (scannedUID === lastProcessedScan.current) return;
        lastProcessedScan.current = scannedUID;

        setUid(scannedUID);

        const cardRef = ref(db, `AuthorizedCards/${scannedUID}`);
        const cardSnap = await get(cardRef);

        if (cardSnap.exists()) {
          const userData = cardSnap.val();
          setName(userData.name || '');
          setEmail(userData.email || '');
          setPhone(userData.phone || '');
          setVehicleNumber(userData.vehicleNumber || '');
          setVehicleModel(userData.vehicleModel || '');
          setVehicleColour(userData.vehicleColour || 'White');
          setExistingUserNotice(`⚠️ This card is already registered to "${userData.name}". You can modify and save to update details.`);
        } else {
          setName('');
          setEmail('');
          setPhone('');
          setVehicleNumber('');
          setVehicleModel('');
          setVehicleColour('White');
          setExistingUserNotice('✨ New card detected! Fill up the form below to authenticate and register.');
        }
      }
    });

    return () => unsubscribe();
  }, [isScanning]);

  const handleStartScan = () => {
    setIsScanning(true);
    lastProcessedScan.current = '';
    setExistingUserNotice(null);
    set(ref(db, 'System/CardRegistrationMode'), true);
  };

  const handleCancelScan = () => {
    setIsScanning(false);
    lastProcessedScan.current = '';
    set(ref(db, 'System/CardRegistrationMode'), false);
    setName('');
    setEmail('');
    setPhone('');
    setUid('');
    setVehicleNumber('');
    setVehicleModel('');
    setExistingUserNotice(null);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !uid) return;

    const cardRef = ref(db, `AuthorizedCards/${uid}`);
    await set(cardRef, {
      name,
      email,
      phone,
      vehicleNumber,
      vehicleModel,
      vehicleColour,
      status: 'Active',
      registeredDate: new Date().toLocaleDateString(),
    });

    setName('');
    setEmail('');
    setPhone('');
    setUid('');
    setVehicleNumber('');
    setVehicleModel('');
    setVehicleColour('White');
    setExistingUserNotice(null);
    setIsScanning(false);
    set(ref(db, 'System/CardRegistrationMode'), false);
    lastProcessedScan.current = '';
  };

  const handleDeleteCard = (cardUid: string) => {
    remove(ref(db, `AuthorizedCards/${cardUid}`));
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">RFID Card Management</h2>
        <p className="text-sm text-slate-400 mt-1">Scan hardware cards to auto-fill UID and manage cloud user authentications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Scan & Register Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 h-fit space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="text-cyan-400" size={20} /> Authenticate / Register Card
          </h3>

          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-800/40 relative overflow-hidden">
            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-cyan-400">
              <Wifi size={32} className={isScanning ? "animate-ping text-cyan-400" : ""} />
            </div>
            <h4 className="font-bold text-white">Scan Hardware Card</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {isScanning ? "Scan mode is ACTIVE. Tap your RFID card on the reader..." : "Click start scan to enable card reading mode."}
            </p>
            
            <button
              type="button"
              onClick={isScanning ? handleCancelScan : handleStartScan}
              className={clsx(
                "w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all",
                isScanning ? "bg-rose-500 text-white animate-pulse" : "bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30"
              )}
            >
              {isScanning ? "Stop Scan Mode (Active)" : "Start Card Scan"}
            </button>
          </div>

          {existingUserNotice && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-cyan-300 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-cyan-400" />
              <span>{existingUserNotice}</span>
            </div>
          )}

          <form onSubmit={handleAddCard} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Card ID (UID)</label>
              <input type="text" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="Scan card to auto-fill" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-cyan-300 text-sm font-mono focus:outline-none focus:border-cyan-500" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">User Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" required />
            </div>

            {/* Email Input Field Added */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. user@example.com" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Phone Number</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +880 1XXXXXXXXX" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Vehicle Number</label>
              <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. Dhaka Metro-23-4567" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Vehicle Model</label>
              <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="e.g. Toyota Corolla" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Vehicle Colour</label>
              <select value={vehicleColour} onChange={(e) => setVehicleColour(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500">
                <option value="White">White</option>
                <option value="Black">Black</option>
                <option value="Silver">Silver</option>
                <option value="Red">Red</option>
                <option value="Blue">Blue</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleCancelScan} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-sm transition-all">Cancel</button>
              <button type="submit" className="w-1/2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20">Save & Authenticate</button>
            </div>
          </form>
        </div>

        {/* Right: Registered Cards Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-700/50 bg-slate-900/60">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="text-emerald-400" size={20} /> Authorized Cloud Database
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">User & Contact</th>
                  <th className="py-3 px-4">Card UID</th>
                  <th className="py-3 px-4">Vehicle Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {cards.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No registered cards found. Scan & add one!</td></tr>
                ) : (
                  cards.map((card) => (
                    <tr key={card.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>{card.name}</div>
                        <div className="text-xs text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                          <Mail size={11} /> {card.email || "No Email"}
                        </div>
                        <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Phone size={11} className="text-emerald-400" /> {card.phone || "No Phone"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300">{card.uid}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-semibold text-white">{card.vehicleNumber || "No Vehicle No."}</div>
                        <div className="text-xs text-slate-400">{card.vehicleModel || "Standard"} ({card.vehicleColour})</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold">{card.status}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => handleDeleteCard(card.uid)} className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors" title="Revoke">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}