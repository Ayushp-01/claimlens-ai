'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { patientAPI } from '@/lib/api';
import { PatientDashboard, Claim } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatDate } from '@/lib/utils';

export default function PatientDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PatientDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await patientAPI.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) {
    return <LoadingState message="Fetching patient dashboard..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Unable to load dashboard'} onRetry={fetchDashboard} />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 sm:p-8 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Claims Overview</h1>
          <p className="mt-1 text-sm text-navy-200">
            Monitor healthcare reimbursements, verification milestones, and settled amounts in real-time.
          </p>
        </div>
        <Link href="/patient/claims/new">
          <Button className="bg-teal-500 hover:bg-teal-600 text-navy-950 font-semibold gap-2 shadow-md">
            <PlusCircle className="h-4 w-4" />
            File New Claim
          </Button>
        </Link>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Claimed</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mt-1">
              <CurrencyDisplay amount={data.totalClaimedAmount} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Gross billing submitted across all policies</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Approved</span>
              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mt-1 text-teal-700">
              <CurrencyDisplay amount={data.totalApprovedAmount} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Sanctioned for payout post tariff verification</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Settled</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mt-1 text-emerald-700">
              <CurrencyDisplay amount={data.totalSettledAmount} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Disbursed directly to hospital or bank account</p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Counters Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Total Claims</p>
          <p className="text-2xl font-extrabold text-navy-950 mt-1">{data.totalClaims}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Awaiting Processing</p>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">{data.awaitingProcessing}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Under Review</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{data.underReview}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Approved</p>
          <p className="text-2xl font-extrabold text-teal-600 mt-1">{data.approved}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Settled</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{data.settled}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <p className="text-2xs font-semibold text-slate-500 uppercase">Rejected</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{data.rejected}</p>
        </div>
      </div>

      {/* Recent Claims Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Claims</h2>
          <Link href="/patient/claims" className="text-sm font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1">
            View all claims
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Reference #</th>
                  <th className="px-6 py-3.5">Hospital / Provider</th>
                  <th className="px-6 py-3.5">Treatment Date</th>
                  <th className="px-6 py-3.5">Claimed Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => router.push(`/patient/claims/${claim.id}`)}
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-navy-900">
                      {claim.referenceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {claim.providerName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(claim.treatmentDate)}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      <CurrencyDisplay amount={claim.claimedAmount} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-navy-700 hover:text-navy-900 text-xs">
                        Details
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
