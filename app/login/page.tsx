'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const ADMIN_USER = 'admin';
  const ADMIN_PASS_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

  const hashPassword = async (str: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      const hashedInputPassword = await hashPassword(password);

      if (username === ADMIN_USER && hashedInputPassword === ADMIN_PASS_HASH) {
        sessionStorage.setItem('seu_admin_logged', 'true');
        router.push('/dashboard'); // Ekhane '/' er bodole '/dashboard' route kore dewa holo
      } else {
        setError('Invalid username or password!');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 relative shadow-2xl backdrop-blur-xl"
      >
        <div className="text-center mb-8">
          {/* Logo Image */}
          <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950/60 border border-slate-800 shadow-inner">
            <Image 
              src="/logo.PNG" 
              alt="SEU Parking Logo" 
              width={70} 
              height={70} 
              className="object-contain"
              priority
            />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-wide">SEU Parking Admin</h2>
          <p className="text-xs text-slate-400 mt-1">Secure Administration Authentication Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure password" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
          >
            Authenticate & Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 font-mono">Default Credentials — User: <span className="text-slate-300">admin</span> | Pass: <span className="text-slate-300">admin123</span></p>
        </div>
      </motion.div>
    </div>
  );
}