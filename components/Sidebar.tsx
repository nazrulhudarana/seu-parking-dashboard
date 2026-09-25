'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Car, CreditCard, Wallet, FileText, Users, Settings, PieChart, X, Wifi, Tv } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Parking Slots', href: '/parking-slots', icon: Car },
    { name: 'Card Management', href: '/card-management', icon: CreditCard },
    { name: 'Billing & Wallet', href: '/billing', icon: Wallet },
    { name: 'Parking Logs', href: '/parking-logs', icon: FileText },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Wi-Fi Config', href: '/wifi-config', icon: Wifi },
    { name: 'LCD Widget', href: '/lcd-widget', icon: Tv },
    { name: 'Reports', href: '/reports', icon: PieChart },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-center px-4 border-b border-slate-800/80 relative">
          <img 
            src="/logo.PNG" 
            alt="SEU Parking Logo" 
            className="w-48 h-auto object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.2)]"
          />
          <button 
            onClick={onClose} 
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm",
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-950/40"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                )}
              >
                <Icon size={18} className={isActive ? "text-cyan-400" : "text-slate-400"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Profile (Bottom) */}
        <div className="p-3 m-4 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-inner">
            NH
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">Nazrul Huda</p>
            <p className="text-[10px] text-slate-400">Administrator</p>
          </div>
        </div>
      </aside>
    </>
  );
}