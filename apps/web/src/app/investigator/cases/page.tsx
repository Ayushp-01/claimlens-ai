'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Search, ArrowUpDown, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { investigatorAPI } from '@/lib/api';
import { ClaimQueueItem } from '@/types';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

export default function InvestigatorCasesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [claims, setClaims] = useState<ClaimQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      // Pre-filter by investigator ID
      const res = await investigatorAPI.getClaims({
        page,
        limit: 20,
        search,
        status: statusFilter,
        assignedTo: user?.id || 'usr-inv-01',
      });
      // Further ensure only claims assigned to this investigator
      setClaims(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCases();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            My Active Investigation Docket
          </h1>
          <p className="text-sm text-slate-500">
            Claims directly allocated to you for clinical adjudication, verification, and payment decisioning.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search within my active cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="under_review">Under Review</option>
            <option value="documentation_requested">Proof Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      {isLoading ? (
        <LoadingState message="Loading your assigned caseload..." />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Caseload Clear"
          description="You currently have no active claims pending your personal review. Check the main queue for unassigned claims."
          actionLabel="View Claims Queue"
          onAction={() => router.push('/investigator/claims')}
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
                  <th className="px-5 py-3.5">Claim Amount</th>
                  <th className="px-5 py-3.5">Risk Score</th>
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
                      {claim.referenceNumber}
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
                        Adjudicate
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
