'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  AlertOctagon,
  Copy,
  Clock,
  ShieldAlert,
  Flame,
  ArrowRight,
  TrendingDown,
  FileCheck2,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { investigatorAPI, analyticsAPI } from '@/lib/api';
import { InvestigatorDashboard, DashboardCharts } from '@/types';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ClaimsOverTimeChart } from '@/components/charts/ClaimsOverTimeChart';
import { ClaimsByStatusChart } from '@/components/charts/ClaimsByStatusChart';
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart';
import { RuleFrequencyChart } from '@/components/charts/RuleFrequencyChart';
import { formatDate } from '@/lib/utils';

export default function InvestigatorDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<InvestigatorDashboard | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, chartRes] = await Promise.all([
        investigatorAPI.getDashboard(),
        analyticsAPI.getDashboardData(),
      ]);
      setDashboard(dashRes);
      setCharts(chartRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch investigator command data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (fetchRef.current) return;
    fetchRef.current = true;
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading claims intelligence dashboard..." />;
  }

  if (error || !dashboard || !charts) {
    return (
      <ErrorState
        title="Dashboard Offline"
        message={error || 'Unable to connect to intelligence engine'}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Claims Intelligence & Fraud Command
          </h1>
          <p className="text-sm text-slate-500">
            Real-time fraud screening, duplicate match queue, and clinical unbundling signals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/investigator/claims">
            <Button className="bg-navy-800 hover:bg-navy-900 text-white gap-2 shadow-xs">
              <Inbox className="h-4 w-4" />
              Open Investigation Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Top KPI Row (Navy Theme Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-navy-900 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-200 uppercase tracking-wider">
              Total Claims Received
            </span>
            <Inbox className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-3xl font-extrabold mt-3">{dashboard.totalClaimsReceived}</p>
          <span className="text-2xs text-navy-300 mt-1">Across all hospital networks</span>
        </div>

        <div className="p-5 rounded-xl bg-navy-900 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-200 uppercase tracking-wider">
              Awaiting Review
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold mt-3 text-amber-300">{dashboard.awaitingReview}</p>
          <span className="text-2xs text-navy-300 mt-1">Pending investigator action</span>
        </div>

        <div className="p-5 rounded-xl bg-navy-900 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-200 uppercase tracking-wider">
              High Priority Claims
            </span>
            <Flame className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold mt-3 text-rose-400">{dashboard.highPriorityClaims}</p>
          <span className="text-2xs text-navy-300 mt-1">Risk score &gt;= 75 / 100</span>
        </div>

        <div className="p-5 rounded-xl bg-navy-900 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-navy-200 uppercase tracking-wider">
              Potential Duplicates
            </span>
            <Copy className="h-4 w-4 text-teal-300" />
          </div>
          <p className="text-3xl font-extrabold mt-3 text-teal-300">{dashboard.potentialDuplicates}</p>
          <span className="text-2xs text-navy-300 mt-1">High similarity cross-matches</span>
        </div>
      </div>

      {/* Row 2: Secondary Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-2xs font-bold uppercase">Billing Inconsistencies</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dashboard.billingInconsistencies}</p>
          <span className="text-2xs text-slate-500">Unbundled or mismatched codes</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-2xs font-bold uppercase">Provider Anomalies</span>
            <ShieldAlert className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dashboard.providerAnomalies}</p>
          <span className="text-2xs text-slate-500">Above agreed tariff ceilings</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-2xs font-bold uppercase">Avg Review Time</span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dashboard.avgReviewTimeHours} hrs</p>
          <span className="text-2xs text-emerald-600 font-semibold">↓ 22% faster this week</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-2xs font-bold uppercase">Investigation Backlog</span>
            <Scale className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1">{dashboard.investigationBacklog}</p>
          <span className="text-2xs text-slate-500">Within standard SLA</span>
        </div>
      </div>

      {/* Row 3: Financial Exposure Cards (Teal Accents) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Under Investigation
            </CardDescription>
            <CardTitle className="text-xl font-bold text-amber-700">
              <CurrencyDisplay amount={dashboard.amountUnderInvestigation} fractionDigits={0} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Active scrutinies awaiting signoff</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 border-l-4 border-l-teal-600 shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Total Approved Amount
            </CardDescription>
            <CardTitle className="text-xl font-bold text-teal-700">
              <CurrencyDisplay amount={dashboard.totalApprovedAmount} fractionDigits={0} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Authorized medical claims</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Total Settled Amount
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-800">
              <CurrencyDisplay amount={dashboard.totalSettledAmount} fractionDigits={0} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Bank payouts disbursed</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 border-l-4 border-l-rose-500 shadow-2xs">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Duplicate Exposure
            </CardDescription>
            <CardTitle className="text-xl font-bold text-rose-700">
              <CurrencyDisplay amount={dashboard.duplicateExposure} fractionDigits={0} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xs text-slate-500">Prevented double billing leakage</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Charts 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Claims Over Time */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Claims Volume & Flagged Anomalies
                </CardTitle>
                <CardDescription className="text-xs">30-day timeline trend</CardDescription>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-navy-50 text-navy-800">
                DAILY TREND
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ClaimsOverTimeChart data={charts.timeSeries} />
          </CardContent>
        </Card>

        {/* Chart 2: Claims by Status */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Claims by Workflow Status</CardTitle>
                <CardDescription className="text-xs">Current distribution in lifecycle</CardDescription>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800">
                PIPELINE
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ClaimsByStatusChart data={charts.statusDistribution} />
          </CardContent>
        </Card>

        {/* Chart 3: Risk Score Distribution */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Risk Score Distribution</CardTitle>
                <CardDescription className="text-xs">0-100 severity categorization</CardDescription>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-800">
                SCORING GAUGE
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart data={charts.riskDistribution} />
          </CardContent>
        </Card>

        {/* Chart 4: Top 5 Rules Triggered */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Top 5 Fraud & Waste Rules</CardTitle>
                <CardDescription className="text-xs">Highest triggered anomaly rules</CardDescription>
              </div>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800">
                NCCI RULES
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RuleFrequencyChart data={charts.topRules} />
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Recent High-Priority Claims Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent High-Priority Claims</h2>
            <p className="text-xs text-slate-500">Claims flagged with critical risk scores or duplicate invoices</p>
          </div>
          <Link href="/investigator/claims" className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1">
            Open Full Queue
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Reference #</th>
                  <th className="px-6 py-3.5">Patient</th>
                  <th className="px-6 py-3.5">Hospital / Provider</th>
                  <th className="px-6 py-3.5">Claimed Amount</th>
                  <th className="px-6 py-3.5">Risk Score</th>
                  <th className="px-6 py-3.5">Days Waiting</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(dashboard.recentHighPriorityClaims || []).map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/investigator/claims/${item.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">
                      <div className="flex items-center gap-2">
                        {item.referenceNumber}
                        {item.isDuplicate && (
                          <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-rose-100 text-rose-800">
                            DUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.patientName}</td>
                    <td className="px-6 py-4 text-slate-700 text-xs">{item.providerName}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      <CurrencyDisplay amount={item.claimedAmount} />
                    </td>
                    <td className="px-6 py-4">
                      <RiskScoreBadge score={item.riskScore} priority={item.riskLevel} />
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {item.daysWaiting} {item.daysWaiting === 1 ? 'day' : 'days'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        className="bg-navy-800 hover:bg-navy-900 text-white text-xs h-8 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/investigator/claims/${item.id}`);
                        }}
                      >
                        Investigate
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
