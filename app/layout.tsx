'use client';

import type { Metadata } from "next";
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
    if (!isLogged && pathname !== '/login') {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // যদি লগইন পেজে থাকে অথবা অথেন্টিকেটেড হয়, তবেই রেন্ডার হবে
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en">
      <body className="antialiased bg-[#0f172a] text-slate-200">
        {isLoginPage ? (
          children
        ) : (
          isAuthenticated && (
            <DashboardShell>
              {children}
            </DashboardShell>
          )
        )}
      </body>
    </html>
  );
}