'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { db } from '../../lib/firebase';
import { 
  Wallet, Receipt, Settings, Search, Plus, CreditCard, 
  AlertTriangle, CheckCircle2, Download, Printer, Wifi, History, User, ArrowUpRight, ArrowDownRight, X, Eye 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<'wallets' | 'billing' | 'settings'>('wallets');
  
  // Data States
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [transactions, setTransactions] = useState<Record<string, any>>({});
  const [receipts, setReceipts] = useState<Record<string, any>>({});
  const [exitLogs, setExitLogs] = useState<Record<string, any>>({}); // এন্ট্রি-এক্সিট টাইমের জন্য
  const [settings, setSettings] = useState({
    firstHourRate: 30, additionalHourRate: 20, gracePeriodMins: 10, maxDailyCharge: 200, minBalanceRequired: 50
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [rechargeModal, setRechargeModal] = useState<string | null>(null);
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // RFID Scan States
  const [isScanningBilling, setIsScanningBilling] = useState(false);
  const [selectedScannedUid, setSelectedScannedUid] = useState<string | null>(null);
  
  // History Modal State
  const [historyModalUid, setHistoryModalUid] = useState<string | null>(null);
  const [historySubTab, setHistorySubTab] = useState<'recharges' | 'parking'>('recharges');

  const lastProcessedScan = useRef<string>('');

  useEffect(() => {
    const unsubWallets = onValue(ref(db, 'Wallets'), s => setWallets(s.val() || {}));
    const unsubUsers = onValue(ref(db, 'AuthorizedCards'), s => setUsers(s.val() || {}));
    const unsubTrans = onValue(ref(db, 'Transactions'), s => setTransactions(s.val() || {}));
    const unsubReceipts = onValue(ref(db, 'Receipts'), s => setReceipts(s.val() || {}));
    const unsubExitLogs = onValue(ref(db, 'Logs/Exit'), s => setExitLogs(s.val() || {})); // এক্সিট লগস ফেচ
    const unsubSettings = onValue(ref(db, 'BillingSettings'), s => {
      if(s.exists()) setSettings(s.val());
    });

    return () => { unsubWallets(); unsubUsers(); unsubTrans(); unsubReceipts(); unsubExitLogs(); unsubSettings(); };
  }, []);

  useEffect(() => {
    if (!isScanningBilling) return;

    const activityRef = ref(db, 'LiveActivity');
    const unsubscribe = onValue(activityRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && data.LastScanUID) {
        const scannedUID = data.LastScanUID;

        if (scannedUID === lastProcessedScan.current) return;
        lastProcessedScan.current = scannedUID;

        if (users[scannedUID] || wallets[scannedUID]) {
          setSelectedScannedUid(scannedUID);
          showToast(`Card detected & selected: ${users[scannedUID]?.name || scannedUID}`, 'success');
        } else {
          showToast(`Scanned UID (${scannedUID}) not found in database!`, 'error');
        }
      }
    });

    return () => unsubscribe();
  }, [isScanningBilling, users, wallets]);

  const handleStartScanBilling = () => {
    setIsScanningBilling(true);
    lastProcessedScan.current = '';
    set(ref(db, 'System/CardRegistrationMode'), true);
    showToast('Scan mode active (Gate control disabled). Tap cards...', 'success');
  };

  const handleStopScanBilling = () => {
    setIsScanningBilling(false);
    lastProcessedScan.current = '';
    set(ref(db, 'System/CardRegistrationMode'), false);
    showToast('Scan mode stopped.', 'success');
  };

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRecharge = async (uid: string, amount: number) => {
    if (!amount || amount <= 0) return;
    
    const currentBal = wallets[uid]?.balance || 0;
    const newBal = currentBal + amount;
    const timestamp = new Date().toLocaleString('en-GB');
    const txId = `TX-${Date.now()}`;

    try {
      const updates: any = {};
      updates[`Wallets/${uid}/balance`] = newBal;
      updates[`Wallets/${uid}/lastRecharge`] = timestamp;
      updates[`Wallets/${uid}/status`] = 'ACTIVE';
      updates[`Transactions/${txId}`] = {
        uid, type: 'Recharge', amount, prevBalance: currentBal, newBalance: newBal, timestamp, desc: 'Manual Recharge via Admin'
      };

      await update(ref(db), updates);
      setRechargeModal(null);
      setCustomAmount('');
      showToast(`Successfully recharged ৳${amount} for ${users[uid]?.name || uid}`, 'success');
    } catch (err) {
      showToast('Recharge failed. Check network.', 'error');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await set(ref(db, 'BillingSettings'), settings);
    showToast('Billing rates updated successfully!', 'success');
  };

  // ================= PRINT & DOWNLOAD HANDLERS =================
  const handlePrint = (rId: string, bill: any, userName: string, entryTime: string, exitTime: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <html>
      <head>
        <title>Receipt - ${rId}</title>
        <style>
          body { font-family: monospace; padding: 40px; color: #1e293b; max-width: 400px; margin: 0 auto; border: 1px dashed #cbd5e1; }
          .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .total { font-size: 1.2rem; font-weight: bold; border-top: 1px solid #1e293b; padding-top: 10px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SEU Smart Parking</h2>
          <p>Official Parking Receipt</p>
        </div>
        <div class="row"><span>Receipt ID:</span> <strong>${rId}</strong></div>
        <div class="row"><span>Name:</span> <strong>${userName}</strong></div>
        <div class="row"><span>Card UID:</span> <strong>${bill.uid}</strong></div>
        <div class="row" style="margin-top: 10px;"><span>Entry Time:</span> <strong>${entryTime}</strong></div>
        <div class="row"><span>Exit Time:</span> <strong>${exitTime}</strong></div>
        <div class="row"><span>Duration:</span> <strong>${bill.duration || 'N/A'}</strong></div>
        <div class="row" style="margin-top: 10px;"><span>Status:</span> <strong>${bill.status}</strong></div>
        
        <div class="row total"><span>Total Fee:</span> <span>৳${bill.fee}</span></div>
        <div class="row" style="margin-top: 10px; color: #64748b;"><span>Remaining Balance:</span> <span>৳${bill.remainingBalance || 0}</span></div>
        
        <p style="text-align: center; margin-top: 30px; font-size: 0.8rem; color: #94a3b8;">Thank you for using SEU Smart Parking!</p>
      </body>
      <script>window.onload = function() { window.print(); window.close(); }</script>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownload = (rId: string, bill: any, userName: string, entryTime: string, exitTime: string) => {
    const text = `
=================================
       SEU SMART PARKING       
      Official Parking Receipt   
=================================

Receipt ID   : ${rId}
Name         : ${userName}
Card UID     : ${bill.uid}
Entry Time   : ${entryTime}
Exit Time    : ${exitTime}
Duration     : ${bill.duration || 'N/A'}
Status       : ${bill.status}

---------------------------------
TOTAL FEE    : ৳${bill.fee}
---------------------------------
Remaining Bal: ৳${bill.remainingBalance || 0}

Thank you for using SEU Smart Parking!
    `.trim();
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${rId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalRevenue = Object.values(receipts).reduce((acc, curr) => acc + (curr.fee || 0), 0);
  const totalBalance = Object.values(wallets).reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const unpaidCount = Object.values(receipts).filter(r => r.status === 'UNPAID').length;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-cyan-400" /> Billing & Wallets
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage RFID Wallets, Billing & Revenues.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-xs text-slate-400 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">৳{totalRevenue}</p>
        </div>
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 border-l-4 border-l-cyan-500 shadow-sm">
          <p className="text-xs text-slate-400 uppercase">Total User Balances</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">৳{totalBalance}</p>
        </div>
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-xs text-slate-400 uppercase">Unpaid Bills</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{unpaidCount} Alerts</p>
        </div>
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-xs text-slate-400 uppercase">Active Wallets</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{Object.keys(wallets).length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        {[
          { id: 'wallets', icon: CreditCard, label: 'RFID Wallets' },
          { id: 'billing', icon: Receipt, label: 'Receipts & Logs' },
          { id: 'settings', icon: Settings, label: 'Rate Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all rounded-t-xl",
              activeTab === tab.id ? "bg-[#0f172a] text-cyan-400 border-t border-x border-slate-700" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
            )}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: RFID WALLETS ================= */}
      {activeTab === 'wallets' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-slate-900 border border-cyan-500/30 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Wifi size={24} className={isScanningBilling ? "animate-ping" : ""} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Hardware Card Scanner (Persistent Mode)</h4>
                <p className="text-xs text-slate-400">
                  {selectedScannedUid ? `Selected Card: ${users[selectedScannedUid]?.name || selectedScannedUid}` : (isScanningBilling ? "Scan mode active. Tap cards continuously..." : "Click start scan to enable card reading.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              {selectedScannedUid && (
                <button 
                  onClick={() => setSelectedScannedUid(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Clear Selection
                </button>
              )}
              <button
                onClick={isScanningBilling ? handleStopScanBilling : handleStartScanBilling}
                className={clsx(
                  "flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                  isScanningBilling ? "bg-rose-500 text-white animate-pulse" : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                )}
              >
                {isScanningBilling ? "Stop Scan Mode (Active)" : "Start Card Scan"}
              </button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by UID, Name, or Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Object.keys(users).filter(uid => {
              if (selectedScannedUid && uid !== selectedScannedUid) return false;
              const u = users[uid];
              const q = searchQuery.toLowerCase();
              return uid.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.vehicleNumber?.toLowerCase().includes(q);
            }).map(uid => {
              const user = users[uid];
              const wallet = wallets[uid] || { balance: 0, status: 'INACTIVE' };
              const isLow = wallet.balance < settings.minBalanceRequired;

              return (
                <div key={uid} className={clsx("bg-[#0f172a] p-5 rounded-2xl border relative overflow-hidden shadow-sm transition-all", selectedScannedUid === uid ? "border-cyan-500 ring-2 ring-cyan-500/30" : "border-slate-800")}>
                  <div className={clsx("absolute top-0 right-0 px-3 py-1 text-[10px] font-bold rounded-bl-xl", 
                    wallet.status === 'ACTIVE' ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                  )}>
                    {wallet.status}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white">{user.name}</h3>
                  <p className="text-xs text-slate-400 font-mono mb-4">{uid} | {user.vehicleNumber}</p>
                  
                  <div className={clsx("p-3 rounded-xl border mb-4 flex items-center justify-between", 
                    isLow ? "bg-rose-500/10 border-rose-500/30" : "bg-slate-900/50 border-slate-800"
                  )}>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Current Balance</p>
                      <p className={clsx("text-2xl font-bold", isLow ? "text-rose-400" : "text-cyan-400")}>
                        ৳{wallet.balance}
                      </p>
                    </div>
                    {isLow && <AlertTriangle className="text-rose-400 animate-pulse" />}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setRechargeModal(uid)}
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Plus size={14} /> Recharge
                    </button>
                    <button 
                      onClick={() => { setHistoryModalUid(uid); setHistorySubTab('recharges'); }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      title="View Transaction History"
                    >
                      <History size={14} /> History
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ================= TAB 2: BILLING & RECEIPTS ================= */}
      {activeTab === 'billing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Receipt ID</th>
                <th className="p-4">User Details</th>
                <th className="p-4">Time Logs (In - Out)</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.keys(receipts).sort((a, b) => {
                const timeA = parseInt(a.replace('PM-', ''), 10) || 0;
                const timeB = parseInt(b.replace('PM-', ''), 10) || 0;
                return timeB - timeA; 
              }).map(rId => {
                const bill = receipts[rId];
                const userName = users[bill.uid]?.name || "Unknown";
                
                // Fetch Entry and Exit Time
                const entryTime = bill.entryTime || exitLogs[bill.uid]?.EntryTime || "N/A";
                const exitTime = bill.exitTime || exitLogs[bill.uid]?.ExitTime || "N/A";

                return (
                  <tr key={rId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-cyan-400 text-xs">{rId}</td>
                    <td className="p-4">
                      <p className="font-bold text-white">{userName}</p>
                      <p className="text-xs text-slate-500 font-mono">{bill.uid}</p>
                    </td>
                    <td className="p-4 text-xs">
                      <div><span className="text-slate-500">In:</span> <span className="text-emerald-400 ml-1">{entryTime}</span></div>
                      <div><span className="text-slate-500">Out:</span> <span className="text-rose-400 ml-1">{exitTime}</span></div>
                      <div className="text-[10px] text-cyan-500 mt-1 bg-cyan-500/10 inline-block px-2 py-0.5 rounded">Dur: {bill.duration}</div>
                    </td>
                    <td className="p-4 font-bold text-white">৳{bill.fee}</td>
                    <td className="p-4">
                      <span className={clsx("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase",
                        bill.status === 'PAID' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => setViewReceiptId(rId)} className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 rounded-lg inline-flex mr-2" title="View Details">
                        <Eye size={16}/>
                      </button>
                      <button onClick={() => handlePrint(rId, bill, userName, entryTime, exitTime)} className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-lg inline-flex mr-2" title="Print Receipt">
                        <Printer size={16}/>
                      </button>
                      <button onClick={() => handleDownload(rId, bill, userName, entryTime, exitTime)} className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-800 rounded-lg inline-flex" title="Download Text">
                        <Download size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {Object.keys(receipts).length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No receipts generated yet.</td></tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ================= TAB 3: RATE SETTINGS ================= */}
      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl">
          <form onSubmit={handleUpdateSettings} className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 space-y-5 shadow-sm">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Automated Billing Rules</h3>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs text-slate-400 uppercase">First Hour Rate (৳)</label>
                <input type="number" value={settings.firstHourRate} onChange={e => setSettings({...settings, firstHourRate: Number(e.target.value)})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Additional Hour Rate (৳)</label>
                <input type="number" value={settings.additionalHourRate} onChange={e => setSettings({...settings, additionalHourRate: Number(e.target.value)})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Grace Period (Mins)</label>
                <input type="number" value={settings.gracePeriodMins} onChange={e => setSettings({...settings, gracePeriodMins: Number(e.target.value)})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Max Daily Charge (৳)</label>
                <input type="number" value={settings.maxDailyCharge} onChange={e => setSettings({...settings, maxDailyCharge: Number(e.target.value)})} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 uppercase">Minimum Wallet Balance for Entry (৳)</label>
                <input type="number" value={settings.minBalanceRequired} onChange={e => setSettings({...settings, minBalanceRequired: Number(e.target.value)})} className="w-full mt-1 bg-slate-900 border border-rose-700/50 rounded-xl p-2.5 text-white outline-none focus:border-rose-500" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-xl shadow-lg mt-4 transition-colors">
              Save Billing Logic
            </button>
          </form>
        </motion.div>
      )}

      {/* RECHARGE MODAL */}
      <AnimatePresence>
        {rechargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-cyan-500/40 p-6 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-1">Recharge Wallet</h3>
              <p className="text-xs text-slate-400 mb-6">User: <span className="font-bold text-cyan-400">{users[rechargeModal]?.name}</span></p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[100, 200, 500, 1000].map(amt => (
                  <button key={amt} onClick={() => handleRecharge(rechargeModal, amt)} className="py-3 rounded-xl bg-slate-800 hover:bg-cyan-700 hover:text-white text-slate-300 font-bold transition-colors border border-slate-700 hover:border-cyan-500">
                    ৳{amt}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input type="number" placeholder="Custom Amount" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-white outline-none focus:border-cyan-500" />
                <button onClick={() => handleRecharge(rechargeModal, Number(customAmount))} className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">Add</button>
              </div>
              
              <button onClick={() => setRechargeModal(null)} className="w-full mt-6 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW RECEIPT MODAL */}
      <AnimatePresence>
        {viewReceiptId && receipts[viewReceiptId] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setViewReceiptId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
              
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Receipt size={24} />
                </div>
                <h3 className="text-lg font-bold text-white">SEU Smart Parking</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">Receipt ID: {viewReceiptId}</p>
              </div>

              <div className="space-y-3 text-sm mb-6 border-t border-b border-slate-800 py-4">
                <div className="flex justify-between"><span className="text-slate-400">Card Holder:</span> <span className="font-bold text-white">{users[receipts[viewReceiptId].uid]?.name || "Unknown"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Entry Time:</span> <span className="text-emerald-400 font-mono">{receipts[viewReceiptId].entryTime || exitLogs[receipts[viewReceiptId].uid]?.EntryTime || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Exit Time:</span> <span className="text-rose-400 font-mono">{receipts[viewReceiptId].exitTime || exitLogs[receipts[viewReceiptId].uid]?.ExitTime || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Duration:</span> <span className="text-cyan-400 font-mono">{receipts[viewReceiptId].duration || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className={receipts[viewReceiptId].status === 'PAID' ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{receipts[viewReceiptId].status}</span></div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-300 font-medium">Total Fee</span>
                <span className="text-2xl font-bold text-cyan-400">৳{receipts[viewReceiptId].fee}</span>
              </div>
              <div className="text-center text-xs text-slate-500 font-mono mb-6">
                Remaining Balance: ৳{receipts[viewReceiptId].remainingBalance || 0}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handlePrint(viewReceiptId, receipts[viewReceiptId], users[receipts[viewReceiptId].uid]?.name || "Unknown", receipts[viewReceiptId].entryTime || exitLogs[receipts[viewReceiptId].uid]?.EntryTime || "N/A", receipts[viewReceiptId].exitTime || exitLogs[receipts[viewReceiptId].uid]?.ExitTime || "N/A")} 
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={16}/> Print
                </button>
                <button 
                  onClick={() => handleDownload(viewReceiptId, receipts[viewReceiptId], users[receipts[viewReceiptId].uid]?.name || "Unknown", receipts[viewReceiptId].entryTime || exitLogs[receipts[viewReceiptId].uid]?.EntryTime || "N/A", receipts[viewReceiptId].exitTime || exitLogs[receipts[viewReceiptId].uid]?.ExitTime || "N/A")} 
                  className="flex-1 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={16}/> Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRANSACTION & PARKING HISTORY MODAL */}
      <AnimatePresence>
        {historyModalUid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-slate-700 p-6 rounded-3xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Card Audit Trail & Logs</h3>
                  <p className="text-xs text-cyan-400">{users[historyModalUid]?.name} ({historyModalUid})</p>
                </div>
                <button onClick={() => setHistoryModalUid(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl mb-4 border border-slate-800">
                <button onClick={() => setHistorySubTab('recharges')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", historySubTab === 'recharges' ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white")}>
                  Recharges ({Object.keys(transactions).filter(txId => transactions[txId].uid === historyModalUid).length})
                </button>
                <button onClick={() => setHistorySubTab('parking')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", historySubTab === 'parking' ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-white")}>
                  Parking Receipts ({Object.keys(receipts).filter(rId => receipts[rId].uid === historyModalUid).length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {historySubTab === 'recharges' && (
                  <>
                    {Object.keys(transactions).filter(txId => transactions[txId].uid === historyModalUid).length === 0 ? (
                      <p className="text-center text-slate-500 py-10 text-xs">No recharge transactions found.</p>
                    ) : (
                      Object.keys(transactions)
                        .filter(txId => transactions[txId].uid === historyModalUid)
                        .sort((a, b) => {
                           const tA = parseInt(a.replace('TX-', ''), 10) || 0;
                           const tB = parseInt(b.replace('TX-', ''), 10) || 0;
                           return tB - tA; 
                        })
                        .map(txId => {
                          const tx = transactions[txId];
                          return (
                            <div key={txId} className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                  <ArrowDownRight size={16} />
                                </div>
                                <div>
                                  <p className="font-bold text-white">Manual Recharge <span className="text-[10px] text-slate-400 font-normal">({tx.timestamp})</span></p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Prev: ৳{tx.prevBalance} → New: ৳{tx.newBalance}</p>
                                </div>
                              </div>
                              <div className="font-bold font-mono text-sm text-emerald-400">+৳{tx.amount}</div>
                            </div>
                          );
                        })
                    )}
                  </>
                )}

                {historySubTab === 'parking' && (
                  <>
                    {Object.keys(receipts).filter(rId => receipts[rId].uid === historyModalUid).length === 0 ? (
                      <p className="text-center text-slate-500 py-10 text-xs">No parking receipts found.</p>
                    ) : (
                      Object.keys(receipts)
                        .filter(rId => receipts[rId].uid === historyModalUid)
                        .sort((a, b) => {
                           const tA = parseInt(a.replace('PM-', ''), 10) || 0;
                           const tB = parseInt(b.replace('PM-', ''), 10) || 0;
                           return tB - tA;
                        })
                        .map(rId => {
                          const bill = receipts[rId];
                          const entryTime = bill.entryTime || exitLogs[bill.uid]?.EntryTime || "N/A";
                          const exitTime = bill.exitTime || exitLogs[bill.uid]?.ExitTime || "N/A";

                          return (
                            <div key={rId} className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">🅿️</div>
                                <div>
                                  <p className="font-bold text-white">Parking Fee <span className="text-[10px] text-cyan-400 font-mono">({rId})</span></p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">In: {entryTime} | Out: {exitTime}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Duration: {bill.duration || "N/A"} | Status: <span className="text-emerald-400 font-bold">{bill.status}</span></p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold font-mono text-sm text-rose-400">-৳{bill.fee}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Bal: ৳{bill.remainingBalance}</div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </>
                )}
              </div>
              <button onClick={() => setHistoryModalUid(null)} className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 right-6 z-50">
            <div className={clsx("px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border", toast.type === 'success' ? "bg-emerald-900/90 border-emerald-500 text-emerald-100" : "bg-rose-900/90 border-rose-500 text-rose-100")}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span className="font-semibold text-sm">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}