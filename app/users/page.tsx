'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../../lib/firebase';
import { Users as UsersIcon, Search, Shield, Car, Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserItem {
  uid: string;
  name: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleColour: string;
  status: string;
  registeredDate: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Authorized Users from Firebase
  useEffect(() => {
    const usersRef = ref(db, 'AuthorizedCards');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userList = Object.keys(data).map((key) => ({
          uid: key,
          ...data[key],
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter Users based on search input
  const filteredUsers = users.filter((user) => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Registered Users</h2>
        <p className="text-sm text-slate-400 mt-1">Directory of all authorized card holders and vehicle owners in the system.</p>
      </div>

      {/* Search Bar Panel */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/50 bg-slate-900/80 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <UsersIcon size={20} />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Total Authorized Users</h4>
            <p className="text-xs text-slate-400 font-mono">{users.length} Active Records</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, UID or vehicle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* Users Table Container */}
      <div className="glass-panel rounded-2xl border border-slate-700/50 bg-slate-900/80 p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Card Holder Name</th>
                <th className="py-3.5 px-4">Card UID</th>
                <th className="py-3.5 px-4">Vehicle Details</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <UsersIcon size={40} className="mx-auto mb-2 opacity-30" />
                    No registered users found in the cloud database.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div>{user.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{user.vehicleNumber || "No Vehicle No."}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-cyan-300 text-xs">{user.uid}</td>
                    <td className="py-4 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 text-white font-medium text-xs">
                        <Car size={14} className="text-blue-400" />
                        {user.vehicleModel || "Standard Vehicle"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Color: {user.vehicleColour || "White"}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold">
                        <CheckCircle2 size={12} /> {user.status || "Active"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      {user.registeredDate || "N/A"}
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