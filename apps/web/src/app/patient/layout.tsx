'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  FolderOpen,
  Bell,
  User,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'My Claims', href: '/patient/claims', icon: FileText },
  { name: 'Submit Claim', href: '/patient/claims/new', icon: PlusCircle },
  { name: 'Documents', href: '/patient/documents', icon: FolderOpen },
  { name: 'Notifications', href: '/patient/notifications', icon: Bell },
  { name: 'Profile & Policies', href: '/patient/profile', icon: User },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, quickLoginAs } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-navy-950 text-white text-xs px-4 py-1.5 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold text-teal-300">DEMO MODE ACTIVE</span>
            <span className="hidden sm:inline text-slate-400">• Patient Portal Sandbox</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => quickLoginAs('investigator')}
              className="text-xs text-teal-300 hover:text-white underline flex items-center gap-1"
            >
              Switch to Investigator Portal
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-9 bg-white border-r border-slate-200 z-30">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100">
            <div className="h-9 w-9 rounded-xl bg-navy-800 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-navy-950 text-base">Claim<span className="text-teal-600">Lens</span></span>
              <span className="ml-1 text-2xs font-semibold px-1 py-0.5 rounded bg-teal-50 text-teal-700">PATIENT</span>
            </div>
          </div>

          <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/patient/dashboard' && pathname.startsWith(item.href) && item.href !== '/patient/claims');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-navy-50 text-navy-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-navy-700' : 'text-slate-500')} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name[0] : 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Priya Sharma'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'patient@claimlens.ai'}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full text-xs text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile Header & Overlay */}
        <div className="lg:pl-64 flex flex-col flex-1">
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <span className="font-bold text-navy-950 text-base">Claim<span className="text-teal-600">Lens</span></span>
            </div>

            <div className="hidden lg:block text-sm font-medium text-slate-500">
              Welcome back, <span className="text-slate-900 font-semibold">{user?.name || 'Priya'}</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/patient/claims/new">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-2xs">
                  <PlusCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Submit New Claim</span>
                  <span className="sm:hidden">New Claim</span>
                </Button>
              </Link>
              <Link href="/patient/notifications">
                <Button variant="outline" size="icon" className="relative h-9 w-9 border-slate-200">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-teal-500" />
                </Button>
              </Link>
            </div>
          </header>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <item.icon className="h-4 w-4 text-slate-500" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="w-full text-xs text-slate-700"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Main content body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
