'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Zap,
  FileSearch,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Building2,
  FileCheck2,
  Scale,
  Sparkles,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { quickLoginAs } = useAuth();

  const handleQuickLaunch = async (role: 'patient' | 'investigator' | 'admin') => {
    await quickLoginAs(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-navy-900 text-teal-300 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-teal-400" />
        <span>Next-Generation Autonomous Claim Intelligence & Duplicate Fraud Detection for Healthcare Insurers</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-navy-800 to-teal-500 flex items-center justify-center shadow-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-navy-900">
                Claim<span className="text-teal-600">Lens</span>
              </span>
              <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-navy-100 text-navy-800 uppercase tracking-wider">
                AI
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#portals" className="hover:text-navy-800 transition-colors">Portals</a>
            <a href="#how-it-works" className="hover:text-navy-800 transition-colors">How It Works</a>
            <a href="#trust" className="hover:text-navy-800 transition-colors">Fairness & Trust</a>
            <a href="#credentials" className="hover:text-navy-800 transition-colors">Demo Access</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex border-slate-300">
                Sign In
              </Button>
            </Link>
            <Link href="/login?demo=true">
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                Explore Demo
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-6 shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-teal-600" />
            <span>Multi-modal OCR • Cross-Hospital Duplicates • Tariffs Scrutiny</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-navy-950 max-w-4xl mx-auto leading-tight">
            AI-Assisted Healthcare{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-700 via-teal-600 to-teal-500">
              Claim Intelligence
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate duplicate billing, flag unbundled charges, and expedite authentic medical reimbursements in seconds with transparent, auditable clinical reasoning.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?role=patient">
              <Button size="lg" className="w-full sm:w-auto bg-navy-800 hover:bg-navy-900 text-white gap-2 shadow-md">
                <UserCheck className="h-5 w-5" />
                Patient Sign In
              </Button>
            </Link>
            <Link href="/login?role=investigator">
              <Button size="lg" className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-md">
                <Building2 className="h-5 w-5" />
                Investigator Sign In
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleQuickLaunch('investigator')}
              className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              1-Click Demo Launch
            </Button>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-2xl font-bold text-navy-900">94.8%</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Duplicate Detection Accuracy</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-2xl font-bold text-teal-600">&lt; 3.2s</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Real-Time Risk Scoring</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-2xl font-bold text-navy-900">₹4.95 Cr</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Duplicate Exposure Prevented</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <p className="text-2xl font-bold text-teal-600">100%</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">Auditable Human-in-the-Loop</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section id="portals" className="py-20 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-widest">Two Specialized Portals</h2>
            <p className="text-3xl font-bold text-navy-950 mt-2">Engineered for Both Patients and Investigators</p>
            <p className="text-slate-600 mt-3 text-sm">Experience real-time transparency for policyholders and deep forensic intelligence for risk teams.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: Patient Portal */}
            <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-navy-700 flex items-center justify-center mb-5">
                  <UserCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Patient Portal</h3>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Simple 4-step wizard to file claims, upload hospital bills, monitor visual settlement timelines, and respond to insurer document requests instantly.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Real-time claim status & payment tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Multi-document upload & bill OCR validator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Zero jargon status explanations</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/login?role=patient" className="w-full">
                  <Button className="w-full bg-navy-700 hover:bg-navy-800 text-white">
                    Enter Patient Portal
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Card 2: Investigator Portal */}
            <Card className="hover:shadow-lg transition-all duration-300 border-teal-200 bg-white ring-1 ring-teal-500/20 flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
                  <FileSearch className="h-6 w-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Investigator Portal</h3>
                  <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800">Advanced</span>
                </div>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Forensic claims workbench with AI risk scoring, side-by-side duplicate comparison, unbundling detection, tariff caps, and full audit logs.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <span>0–100 automated risk priority score gauge</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <span>Cross-hospital duplicate match detector</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    <span>One-click document request & decision engine</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Link href="/login?role=investigator" className="w-full">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                    Enter Investigation Hub
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Card 3: Live Interactive Demo */}
            <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-5">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Explore Demo</h3>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Experience pre-seeded real Indian healthcare claims with active duplicate alerts, critical ICU discrepancies, and live analytics dashboards.
                </p>
                <ul className="mt-5 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Pre-loaded Apollo, Max, and Fortis claims</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Full Recharts executive analytics suites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    <span>Instant toggle between patient & investigator</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  onClick={() => handleQuickLaunch('investigator')}
                  variant="outline"
                  className="w-full border-indigo-300 text-indigo-800 hover:bg-indigo-50"
                >
                  Quick Demo Launch
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-teal-700 uppercase tracking-widest">End-to-End Pipeline</h2>
            <p className="text-3xl font-bold text-navy-950 mt-2">How ClaimLens AI Operates</p>
            <p className="text-slate-600 mt-3 text-sm">Four autonomous yet human-governed stages ensure prompt payments for honest patients and ironclad protection for insurers.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-4xl font-extrabold text-navy-100 block mb-3">01</span>
              <h4 className="text-lg font-bold text-slate-900">1. Submit & OCR</h4>
              <p className="text-sm text-slate-600 mt-2">
                Patient enters treatment line items and uploads hospital bills. AI validates policy limits and extracts invoice details.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-4xl font-extrabold text-navy-100 block mb-3">02</span>
              <h4 className="text-lg font-bold text-slate-900">2. Screen & Cross-Check</h4>
              <p className="text-sm text-slate-600 mt-2">
                AI cross-references national claim registries for duplicate invoice numbers, unbundled surgical CPT codes, and tariff caps.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-4xl font-extrabold text-navy-100 block mb-3">03</span>
              <h4 className="text-lg font-bold text-slate-900">3. Review & Investigate</h4>
              <p className="text-sm text-slate-600 mt-2">
                Low-risk claims auto-clear. High-risk claims enter the investigator workbench with side-by-side evidence breakdowns.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-4xl font-extrabold text-navy-100 block mb-3">04</span>
              <h4 className="text-lg font-bold text-slate-900">4. Settle & Disburse</h4>
              <p className="text-sm text-slate-600 mt-2">
                Automated or investigator-approved settlements trigger direct bank disbursements in Indian Rupees with full audit tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Fairness */}
      <section id="trust" className="py-20 bg-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-300 text-xs font-semibold mb-4">
                <Scale className="h-3.5 w-3.5" />
                <span>Explainable AI Principles</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Built for transparency. <br />
                <span className="text-teal-400">Designed for fairness.</span>
              </h2>
              <p className="mt-4 text-slate-300 text-base leading-relaxed">
                ClaimLens AI never makes silent black-box rejections. Every flagged anomaly is supported by clinical evidence, verifiable CPT billing guidelines, and an explicit false-positive override mechanism.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Human-In-The-Loop Governance:</strong> Only authorized investigators make final denial or sanction decisions.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Patient Transparency:</strong> Patients receive clear, empathetic guidance on required documents without confusing internal risk scores.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Immutable Audit Trail:</strong> Every risk evaluation, note, and status transition is recorded with timestamped actor provenance.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-navy-900/80 rounded-2xl p-6 border border-navy-800 shadow-2xl">
              <h4 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-4">
                Live Engine Scoring Benchmark
              </h4>
              <div className="space-y-4 font-mono text-xs">
                <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-slate-400">INPUT:</span> CPT-47562 + OT-ANESTH (Apollo)
                  <p className="text-emerald-400 mt-1">✓ Valid bundled tariffs • Risk Score: 12 (LOW) • Auto-settle candidate</p>
                </div>
                <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-slate-400">INPUT:</span> MAX-DL-2026-8841 (Max Saket)
                  <p className="text-rose-400 mt-1">✗ 94% similarity with CLM-44109 • Duplicate Invoice • Risk Score: 84</p>
                </div>
                <div className="p-3 rounded-lg bg-navy-950/60 border border-navy-800">
                  <span className="text-slate-400">ACTION:</span> Investigator requested official Cath Lab Telemetry
                  <p className="text-amber-400 mt-1">⏳ Verification pending • Patient notified with single-click upload</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Footer */}
      <footer id="credentials" className="bg-slate-900 text-slate-400 py-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 mb-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-teal-400" />
                  Quick Demo Sign-In Credentials
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Use these ready-to-test credentials or use the 1-Click buttons below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleQuickLaunch('patient')}
                  className="bg-navy-700 hover:bg-navy-600 text-white text-xs"
                >
                  Login as Patient (Aarav Sharma)
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleQuickLaunch('investigator')}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs"
                >
                  Login as Investigator (Vikram Rathore)
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleQuickLaunch('admin')}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs"
                >
                  Login as Admin (Anita Desai)
                </Button>
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700 text-xs">
              <div>
                <span className="font-semibold text-slate-200">Patient:</span>{' '}
                <code className="text-teal-300">patient1@demo.claimlens.ai</code> / <code className="text-slate-300">Demo@Patient1</code>
              </div>
              <div>
                <span className="font-semibold text-slate-200">Investigator:</span>{' '}
                <code className="text-teal-300">investigator@demo.claimlens.ai</code> / <code className="text-slate-300">Demo@Invest1</code>
              </div>
              <div>
                <span className="font-semibold text-slate-200">Admin:</span>{' '}
                <code className="text-teal-300">admin@demo.claimlens.ai</code> / <code className="text-slate-300">Demo@Admin1</code>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} ClaimLens AI. All rights reserved. Healthcare Claim Intelligence Platform.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-slate-300">Sign In</Link>
              <Link href="/register" className="hover:text-slate-300">Patient Registration</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
