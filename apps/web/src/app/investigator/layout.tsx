'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Copy,
  BarChart3,
  Briefcase,
  History,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/investigator/dashboard', icon: LayoutDashboard },
  { name: 'Claims Queue', href: '/investigator/claims', icon: Inbox },
  { name: 'Duplicate Matches', href: '/investigator/duplicates', icon: Copy },
  { name: 'Executive Analytics', href: '/investigator/analytics', icon: BarChart3 },
  { name: 'My Active Cases', href: '/investigator/cases', icon: Briefcase },
  { name: 'System Audit Logs', href: '/investigator/audit-logs', icon: History },
  { name: 'Investigator Profile', href: '/investigator/profile', icon: UserIcon },
];

export default function InvestigatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, logout, quickLoginAs } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Demo Banner */}
      {isDemoMode && (
        <div className="bg-navy-950 text-white text-xs px-4 py-1.5 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="font-semibold text-teal-300">DEMO MODE ACTIVE</span>
            <span className="hidden sm:inline text-slate-400">• Forensic Claims Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => quickLoginAs('patient')}
              className="text-xs text-teal-300 hover:text-white underline flex items-center gap-1"
            >
              Switch to Patient Portal
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-9 bg-navy-950 text-white z-30">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-navy-900">
            <div className="h-9 w-9 rounded-xl bg-teal-500 text-navy-950 flex items-center justify-center font-bold shadow-md">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base">Claim<span className="text-teal-400">Lens</span></span>
              <span className="ml-1 text-2xs font-bold px-1.5 py-0.5 rounded bg-teal-900/80 text-teal-300 uppercase tracking-wider">
                {role === 'admin' ? 'ADMIN' : 'INVESTIGATOR'}
              </span>
            </div>
          </div>

          <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/investigator/dashboard' &&
                  pathname.startsWith(item.href) &&
                  item.href !== '/investigator/claims');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-navy-800 text-teal-300 font-semibold shadow-inner'
                      : 'text-slate-300 hover:bg-navy-900 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-teal-400' : 'text-slate-400')} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User footer */}
          <div className="p-4 border-t border-navy-900 bg-navy-900/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'I')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || user?.email || 'Investigator'}</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-2xs text-teal-300 font-mono capitalize">
                    {role || 'Investigator'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full text-xs text-slate-200 border-navy-700 bg-navy-900 hover:bg-navy-800 hover:text-white gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile & Content Area */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
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

            <div className="hidden lg:flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-navy-100 text-navy-800 font-mono">
                WORKBENCH v2.4
              </span>
              <span className="text-sm text-slate-500">
                AI Cross-Registry Screening Active • NCCI Tariff Rulepack 2026
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/investigator/claims">
                <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 gap-1.5 text-xs">
                  <Inbox className="h-3.5 w-3.5" />
                  Claims Queue
                </Button>
              </Link>
              <Link href="/investigator/duplicates">
                <Button size="sm" className="bg-navy-800 hover:bg-navy-900 text-white gap-1.5 text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicates
                </Button>
              </Link>
            </div>
          </header>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-navy-950 text-white border-b border-navy-900 px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-navy-900"
                >
                  <item.icon className="h-4 w-4 text-teal-400" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 border-t border-navy-900">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="w-full text-xs text-white border-navy-700 bg-navy-900"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Main workspace */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
