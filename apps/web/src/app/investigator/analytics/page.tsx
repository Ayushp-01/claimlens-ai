'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Building2,
  Filter,
  TrendingUp,
  Percent,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { analyticsAPI } from '@/lib/api';
import { DashboardCharts, AnalyticsParams } from '@/types';
import { ClaimsOverTimeChart } from '@/components/charts/ClaimsOverTimeChart';
import { ClaimsByStatusChart } from '@/components/charts/ClaimsByStatusChart';
import { RiskDistributionChart } from '@/components/charts/RiskDistributionChart';
import { AmountComparisonChart } from '@/components/charts/AmountComparisonChart';
import { RuleFrequencyChart } from '@/components/charts/RuleFrequencyChart';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useToast } from '@/components/ui/toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { formatINR } from '@/lib/utils';

export default function AnalyticsDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardCharts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: AnalyticsParams = {
        provider: selectedProvider !== 'all' ? selectedProvider : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        riskLevel: selectedRisk !== 'all' ? selectedRisk : undefined,
      };
      const res = await analyticsAPI.getDashboardData(params);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedProvider, selectedStatus, selectedRisk]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await analyticsAPI.exportCSV({
        provider: selectedProvider !== 'all' ? selectedProvider : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claimlens-analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Downloaded',
        description: 'Executive analytics CSV generated.',
        type: 'success',
      });
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Generating executive claims intelligence charts..." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Analytics Engine Offline"
        message={error || 'Unable to aggregate metrics'}
        onRetry={fetchAnalytics}
      />
    );
  }

  const { summaryMetrics } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title & CSV Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Claims Intelligence & Actuarial Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Holistic metrics across claims volume, unbundling leakages, duplicate exposure, and turnaround latency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            className="border-slate-300 text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            isLoading={isExporting}
            className="bg-navy-800 hover:bg-navy-900 text-white gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export Full Dataset
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Provider Network:</span>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Hospital Chains</option>
            <option value="Apollo Hospitals">Apollo Hospitals</option>
            <option value="Max Healthcare">Max Healthcare</option>
            <option value="Fortis Healthcare">Fortis Healthcare</option>
            <option value="Manipal Hospitals">Manipal Hospitals</option>
            <option value="Narayana Health">Narayana Health</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Claim Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="settled">Settled</option>
            <option value="approved">Approved</option>
            <option value="under_review">Under Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Risk Severity:</span>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Severity Bands</option>
            <option value="critical">Critical (76-100)</option>
            <option value="high">High (51-75)</option>
            <option value="medium">Medium (26-50)</option>
            <option value="low">Low (0-25)</option>
          </select>
        </div>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase text-slate-400">Total Processed</span>
          <p className="text-2xl font-extrabold text-navy-950 mt-1">{summaryMetrics.totalClaims}</p>
          <span className="text-2xs text-slate-500">Across all registries</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase text-slate-400">Flag Rate</span>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{summaryMetrics.flagRate}%</p>
          <span className="text-2xs text-slate-500">Subject to review</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase text-slate-400">Duplicate Rate</span>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{summaryMetrics.duplicateRate}%</p>
          <span className="text-2xs text-slate-500">Identical / near-clones</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase text-slate-400">False Positive Rate</span>
          <p className="text-2xl font-extrabold text-teal-600 mt-1">{summaryMetrics.falsePositiveRate}%</p>
          <span className="text-2xs text-slate-500">Clinically cleared</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-2xs font-bold uppercase text-slate-400">Approval Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{summaryMetrics.approvalRate}%</p>
          <span className="text-2xs text-slate-500">Sanctioned & settled</span>
        </div>
      </div>

      {/* Charts Grid: 8 Executive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Claims Over Time */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              1. Claims Received & Flags Over Time
            </CardTitle>
            <CardDescription className="text-xs">Daily intake vs AI flagged anomalies</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimsOverTimeChart data={data.timeSeries} />
          </CardContent>
        </Card>

        {/* Chart 2: Amounts by Month */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              2. Claimed vs Approved vs Settled (₹ INR)
            </CardTitle>
            <CardDescription className="text-xs">Financial settlement volume by month</CardDescription>
          </CardHeader>
          <CardContent>
            <AmountComparisonChart data={data.amountComparison} />
          </CardContent>
        </Card>

        {/* Chart 3: Claims by Status */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              3. Status Pipeline Distribution
            </CardTitle>
            <CardDescription className="text-xs">Current proportions across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimsByStatusChart data={data.statusDistribution} />
          </CardContent>
        </Card>

        {/* Chart 4: Risk Distribution */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              4. Risk Score Categorization
            </CardTitle>
            <CardDescription className="text-xs">Low, Medium, High, and Critical bands</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDistributionChart data={data.riskDistribution} />
          </CardContent>
        </Card>

        {/* Chart 5: Top Rules */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              5. Top Anomaly Rules Triggered
            </CardTitle>
            <CardDescription className="text-xs">NCCI bundling & duplicate logic triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <RuleFrequencyChart data={data.topRules} />
          </CardContent>
        </Card>

        {/* Chart 6: Claims by Provider */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              6. Hospital Provider Network Distribution
            </CardTitle>
            <CardDescription className="text-xs">Claim volumes across top hospital networks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.providerSummary} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="providerName" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-md text-xs">
                            <p className="font-bold text-slate-900">{label}</p>
                            <p className="text-slate-600 mt-1">Total Claims: {item.totalClaims}</p>
                            <p className="text-amber-600 font-semibold">Flag Rate: {item.flagRate}%</p>
                            <p className="text-navy-950 font-mono mt-0.5">Amount: {formatINR(item.totalAmount)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="totalClaims" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Total Claims" />
                  <Bar dataKey="flaggedClaims" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Flagged Claims" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 7: Duplicate Exposure by Provider */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              7. Duplicate Billing Exposure by Provider (₹)
            </CardTitle>
            <CardDescription className="text-xs">Financial exposure intercepted per provider group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.duplicateExposure}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                  />
                  <YAxis type="category" dataKey="providerName" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-md text-xs">
                            <p className="font-bold text-slate-900">{item.providerName}</p>
                            <p className="text-rose-600 font-bold font-mono mt-1">
                              Exposure: {formatINR(item.exposureAmount)}
                            </p>
                            <p className="text-slate-600">Matches: {item.duplicateCount} claims</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="exposureAmount" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 8: Investigation Turnaround Time */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              8. Investigation Turnaround Latency (Hours)
            </CardTitle>
            <CardDescription className="text-xs">Average elapsed hours from submission to adjudication</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.turnaroundTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit="h" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2 rounded border border-slate-200 bg-white text-xs shadow-md">
                            <p className="font-bold">{label}</p>
                            <p className="text-teal-700 font-semibold">{payload[0].value} hours avg turnaround</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgHours"
                    name="Avg Hours"
                    stroke="#1e3a8a"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#14b8a6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
