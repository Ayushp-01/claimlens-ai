'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patientAPI } from '@/lib/api';
import { Claim, ClaimStatus } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';

export default function PatientClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      const res = await patientAPI.getClaims({
        page,
        limit: 10,
        search,
        status: statusFilter,
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
    fetchClaims();
  }, [page, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClaims();
  };

  const toggleSort = (type: 'date' | 'amount') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Claims</h1>
          <p className="text-sm text-slate-500">Track and review all medical reimbursements submitted under your policies.</p>
        </div>
        <Link href="/patient/claims/new">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-2xs">
            <PlusCircle className="h-4 w-4" />
            File New Claim
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by reference number or hospital name..."
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
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="validation">Validation</option>
            <option value="risk_screening">Risk Screening</option>
            <option value="under_review">Under Review</option>
            <option value="documentation_requested">Action Required</option>
            <option value="approved">Approved</option>
            <option value="partially_approved">Partially Approved</option>
            <option value="settled">Settled</option>
            <option value="rejected">Rejected</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('date')}
            className="h-10 gap-1.5 border-slate-300 text-slate-700"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Date
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('amount')}
            className="h-10 gap-1.5 border-slate-300 text-slate-700"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Amount
          </Button>
        </div>
      </div>

      {/* Claims Table */}
      {isLoading ? (
        <LoadingState message="Loading your claims..." />
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims found"
          description="You don't have any claims matching your filters. You can submit a new claim anytime."
          actionLabel="File a New Claim"
          onAction={() => router.push('/patient/claims/new')}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3.5">Reference #</th>
                  <th className="px-6 py-3.5">Patient / Claimant</th>
                  <th className="px-6 py-3.5">Provider / Hospital</th>
                  <th className="px-6 py-3.5">Treatment Date</th>
                  <th className="px-6 py-3.5">Claimed Amount</th>
                  <th className="px-6 py-3.5">Approved Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => router.push(`/patient/claims/${claim.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-navy-900">
                      {claim.referenceNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {claim.patientName}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {claim.providerName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(claim.treatmentDate)}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      <CurrencyDisplay amount={claim.claimedAmount} />
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {claim.approvedAmount ? (
                        <CurrencyDisplay amount={claim.approvedAmount} />
                      ) : (
                        <span className="text-slate-400 font-sans text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-navy-700 hover:text-navy-900 text-xs">
                        View
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
            limit={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
}
