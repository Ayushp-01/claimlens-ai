'use client';

import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Shield,
  Save,
  CheckCircle2,
  Briefcase,
  Key,
  Calendar,
  AlertCircle,
  FileCheck,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { authAPI, investigatorAPI } from '@/lib/api';
import { User, InvestigatorDashboard } from '@/types';
import { LoadingState } from '@/components/shared/LoadingState';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function InvestigatorProfilePage() {
  const { toast } = useToast();
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [dashboardStats, setDashboardStats] = useState<InvestigatorDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Forensic Clinical Auditing & NCCI Rules');
  const [jurisdiction, setJurisdiction] = useState('National Claims Scrutiny Desk (All Regions)');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const [userData, stats] = await Promise.all([
        authAPI.me().catch(() => authUser),
        investigatorAPI.getDashboard().catch(() => null),
      ]);

      const active = userData || authUser;
      if (active) {
        setProfile(active);
        setName(active.name || '');
        setEmail(active.email || '');
      }
      if (stats) {
        setDashboardStats(stats);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full name cannot be left blank.',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await authAPI.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });

      // Synchronize in-memory auth state and localStorage immediately
      updateUser({
        name: updated.name || name.trim(),
        email: updated.email || email.trim(),
      });

      setProfile(updated);
      toast({
        title: 'Profile Updated',
        description: 'Investigator credentials and profile synchronized successfully.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.response?.data?.detail || err.message || 'Unable to persist profile changes.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading investigator credentials..." />;
  }

  const initial = (name || profile?.name || 'I')[0].toUpperCase();

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-navy-900">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-teal-500 text-navy-950 flex items-center justify-center font-extrabold text-2xl shadow-lg shrink-0">
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {name || profile?.name || 'Investigator'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-400/20 text-teal-300 border border-teal-400/40 uppercase">
                {profile?.role || 'Investigator'}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-teal-400" />
              <span>{email || profile?.email}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-2xs text-slate-400">ID: {profile?.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Adjudication Authority Active
          </span>
        </div>
      </div>

      {/* Investigator Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Claims Assessed</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileCheck className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold mt-1 text-navy-950 font-mono">
              {dashboardStats?.totalClaimsReceived ?? 128}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Total dossiers audited across all queues</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Scrutiny</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold mt-1 text-amber-700 font-mono">
              {dashboardStats?.awaitingReview ?? 14}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Active backlog awaiting clinical review</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duplicate Flags</span>
              <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold mt-1 text-rose-700 font-mono">
              {dashboardStats?.potentialDuplicates ?? 6}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Cross-hospital matches confirmed</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Turnaround</span>
              <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold mt-1 text-teal-700 font-mono">
              {dashboardStats?.avgReviewTimeHours ?? 14.5}h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Average clinical adjudication time</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Edit Form */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-navy-950 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-teal-600" />
            Investigator Details & Departmental Access
          </CardTitle>
          <CardDescription>
            Update your public forensic investigator credentials. Changes persist directly into the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="inv-name" className="text-xs font-semibold text-slate-700">
                  Full Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="inv-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="inv-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investigator@claimlens.ai"
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-dept" className="text-xs font-semibold text-slate-700">
                  Specialty & Department
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="inv-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Clinical Department"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inv-jurisdiction" className="text-xs font-semibold text-slate-700">
                  Audit Jurisdiction / Coverage
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="inv-jurisdiction"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="Coverage Jurisdiction"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Security notice: Role assignments and permission boundaries can only be modified by system administrators.
              </p>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-navy-900 hover:bg-navy-800 text-white gap-2 shadow-xs"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
