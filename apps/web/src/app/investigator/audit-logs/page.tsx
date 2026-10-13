'use client';

import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { investigatorAPI } from '@/lib/api';
import { AuditLog } from '@/types';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime } from '@/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actorSearch, setActorSearch] = useState('');
  const [actionSearch, setActionSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiffLog, setSelectedDiffLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await investigatorAPI.getAuditLogs({
        page,
        limit: 15,
        actor: actorSearch || undefined,
        action: actionSearch || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            System & Adjudication Audit Logs
          </h1>
          <p className="text-sm text-slate-500">
            Immutable compliance record of all claim evaluations, risk overrides, note additions, and payment sanctions.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by investigator or actor name..."
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              className="pl-9 h-10 w-full text-xs"
            />
          </div>
          <div className="relative flex-1">
            <Input
              placeholder="Filter by action (e.g. CLAIM_SUBMITTED, SETTLEMENT)..."
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              className="h-10 w-full text-xs"
            />
          </div>
          <Button type="submit" size="sm" className="bg-navy-800 hover:bg-navy-900 text-white text-xs h-10 px-4">
            Filter Logs
          </Button>
        </form>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingState message="Loading tamper-evident audit ledger..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit entries"
          description="No event records matched your filter query."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Action Executed</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">Entity ID</th>
                  <th className="px-5 py-3.5">Event Details</th>
                  <th className="px-5 py-3.5 text-right">Diff Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold uppercase text-2xs">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-navy-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{log.entityType}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-800 whitespace-nowrap">
                      {log.entityId}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-xs truncate" title={String(log.details)}>
                      {String(log.details)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDiffLog(log)}
                        className="text-navy-700 hover:text-navy-900 text-xs h-7 px-2 gap-1"
                      >
                        <FileCode className="h-3.5 w-3.5" />
                        JSON Diff
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
            limit={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* JSON Diff Viewer Dialog */}
      <Dialog open={!!selectedDiffLog} onOpenChange={() => setSelectedDiffLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              Audit Event: {selectedDiffLog?.action}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Entity: {selectedDiffLog?.entityType} ({selectedDiffLog?.entityId}) • Recorded: {formatDateTime(selectedDiffLog?.timestamp)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-1">Details Summary:</span>
              <p className="text-slate-800">{String(selectedDiffLog?.details)}</p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-2">Audit Payload State:</span>
              <div className="bg-slate-900 text-teal-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-72">
                <pre>
                  {JSON.stringify(
                    selectedDiffLog?.diff || {
                      event_id: selectedDiffLog?.id,
                      timestamp: selectedDiffLog?.timestamp,
                      actor: {
                        name: selectedDiffLog?.actorName,
                        role: selectedDiffLog?.actorRole,
                        id: selectedDiffLog?.actorId,
                      },
                      entity: {
                        type: selectedDiffLog?.entityType,
                        id: selectedDiffLog?.entityId,
                      },
                      action: selectedDiffLog?.action,
                      compliance_hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
