'use client';

import "./globals.css";
import DashboardShell from "../components/DashboardShell"; 
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
    const isLogged = sessionStorage.getItem('seu_admin_logged');
    
    // Jodi admin login kora na thake ebong user dashboard ba protected route-e enter korte chay
    if (!isLogged && pathname.startsWith('/dashboard')) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Root landing page ('/') ba login page ('/login') hole DashboardShell hobe na
  const isPublicPage = pathname === '/' || pathname === '/login';

  return (
    <html lang="en">
      <body className="antialiased bg-[#0f172a] text-slate-200">
        {isPublicPage ? (
          children
        ) : (
          <DashboardShell>
            {children}
          </DashboardShell>
        )}
      </body>
    </html>
  );
}