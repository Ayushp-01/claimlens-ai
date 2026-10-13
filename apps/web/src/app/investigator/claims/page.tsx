'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  Copy,
  User,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { investigatorAPI, analyticsAPI } from '@/lib/api';
import { ClaimQueueItem } from '@/types';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/toast';
import { formatDate, cn } from '@/lib/utils';

export default function InvestigatorClaimsQueuePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [claims, setClaims] = useState<ClaimQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [queueType, setQueueType] = useState<'all' | 'flagged'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'riskScore' | 'daysWaiting'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await investigatorAPI.getClaims({
        page,
        limit: 20,
        search,
        status: statusFilter,
        riskLevel: riskFilter,
        queueType,
        sortBy,
        sortOrder,
      });
      setClaims(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [page, statusFilter, riskFilter, queueType, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQueue();
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await analyticsAPI.exportCSV({
        status: statusFilter,
        riskLevel: riskFilter,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claimlens-investigation-queue-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Complete',
        description: 'Investigation queue downloaded as CSV.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSort = (col: 'date' | 'amount' | 'riskScore' | 'daysWaiting') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Investigation Claims Queue
          </h1>
          <p className="text-sm text-slate-500">
            Priority-ranked healthcare claims flagged for unbundling, tariff inflation, or duplicate matches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            className="border-slate-300 text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            isLoading={isExporting}
            className="border-slate-300 text-slate-700 gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Queue View Selector: All Claims vs High Risk & Flagged Queue */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setQueueType('all');
            setPage(1);
          }}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-lg transition-all',
            queueType === 'all'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          )}
        >
          All Claims ({total})
        </button>
        <button
          onClick={() => {
            setQueueType('flagged');
            setPage(1);
          }}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5',
            queueType === 'flagged'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          )}
        >
          <ShieldAlert className="h-4 w-4" />
          High Risk &amp; Flagged Queue
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by claim reference, patient name, or hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Risk Priority:</span>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-600"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical (76-100)</option>
              <option value="high">High (51-75)</option>
              <option value="medium">Medium (26-50)</option>
              <option value="low">Low (0-25)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-600"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="validation">Validation</option>
              <option value="risk_screening">Risk Screening</option>
              <option value="under_review">Under Review</option>
              <option value="documentation_requested">Action Required</option>
              <option value="approved">Approved</option>
              <option value="partially_approved">Partially Approved</option>
              <option value="rejected">Rejected</option>
              <option value="payment_processing">Payment Processing</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort by:</span>
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('date')}
              className="h-8 text-xs px-2.5 gap-1"
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant={sortBy === 'riskScore' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('riskScore')}
              className="h-8 text-xs px-2.5 gap-1"
            >
              Risk Score {sortBy === 'riskScore' && (sortOrder === 'asc' ? '↑' : '↓')}
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant={sortBy === 'amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('amount')}
              className="h-8 text-xs px-2.5 gap-1"
            >
              Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              <ArrowUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant={sortBy === 'daysWaiting' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSort('daysWaiting')}
              className="h-8 text-xs px-2.5 gap-1"
            >
              Days Waiting
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      {isLoading ? (
        <LoadingState message="Filtering queue..." />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Queue Empty"
          description="No claims found matching the specified risk priority or status filters."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Reference #</th>
                  <th className="px-5 py-3.5">Patient</th>
                  <th className="px-5 py-3.5">Hospital / Provider</th>
                  <th className="px-5 py-3.5">Treatment Date</th>
                  <th className="px-5 py-3.5">Amount (₹)</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Rules</th>
                  <th className="px-5 py-3.5">Assigned</th>
                  <th className="px-5 py-3.5">Waiting</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => router.push(`/investigator/claims/${claim.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-navy-900">
                      <div className="flex items-center gap-1.5">
                        <span>{claim.referenceNumber}</span>
                        {claim.isDuplicate && (
                          <span className="px-1.5 py-0.5 text-2xs font-bold rounded bg-rose-100 text-rose-800">
                            DUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{claim.patientName}</td>
                    <td className="px-5 py-4 text-xs text-slate-700">{claim.providerName}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(claim.treatmentDate)}</td>
                    <td className="px-5 py-4 font-mono font-semibold text-slate-900">
                      <CurrencyDisplay amount={claim.claimedAmount} />
                    </td>
                    <td className="px-5 py-4">
                      <RiskScoreBadge score={claim.riskScore} priority={claim.riskLevel} />
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold font-mono">
                        {claim.rulesTriggered} triggered
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {claim.assignedToName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {claim.daysWaiting}d
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        className="bg-navy-800 hover:bg-navy-900 text-white text-xs h-8 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/investigator/claims/${claim.id}`);
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

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            limit={20}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
}
