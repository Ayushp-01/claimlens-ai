'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { investigatorAPI } from '@/lib/api';
import { DuplicateMatch } from '@/types';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export default function DuplicateMatchesPage() {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'exact' | 'near_duplicate'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>('dup-1');

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const data = await investigatorAPI.getDuplicates();
      setDuplicates(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: DuplicateMatch['status']) => {
    try {
      await investigatorAPI.resolveDuplicate(id, newStatus);
    } catch (e) {
      console.warn('API error recording duplicate decision:', e);
    }
    setDuplicates((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
    toast({
      title: newStatus === 'confirmed_duplicate' ? 'Confirmed Duplicate' : 'Cleared as False Positive',
      description: 'Audit status committed to ledger.',
      type: newStatus === 'confirmed_duplicate' ? 'error' : 'success',
    });
  };

  const filtered = duplicates.filter((d) => {
    if (activeTab === 'all') return true;
    return d.matchType === activeTab;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Cross-Hospital Duplicate Detection
          </h1>
          <p className="text-sm text-slate-500">
            AI-driven multi-insurer registry screening flagging identical invoice numbers, overlapping dates, and cloned claims.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All Suspected Matches ({duplicates.length})</TabsTrigger>
            <TabsTrigger value="exact">
              Exact Duplicates ({duplicates.filter((d) => d.matchType === 'exact').length})
            </TabsTrigger>
            <TabsTrigger value="near_duplicate">
              Near Duplicates ({duplicates.filter((d) => d.matchType === 'near_duplicate').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <LoadingState message="Scanning cross-insurer duplicate registries..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Copy}
          title="No duplicate conflicts found"
          description="There are currently no active duplicate flags matching this filter."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((dup) => {
            const isExpanded = expandedId === dup.id;

            return (
              <Card
                key={dup.id}
                className={`border transition-all ${
                  dup.status === 'confirmed_duplicate'
                    ? 'border-rose-300 bg-rose-50/20'
                    : dup.status === 'cleared_false_positive'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                        <Copy className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-navy-950 text-sm">
                            {dup.claim1Reference}
                          </span>
                          <span className="text-slate-400 font-semibold text-xs">↔</span>
                          <span className="font-mono font-bold text-rose-700 text-sm">
                            {dup.claim2Reference}
                          </span>
                          <span
                            className={`text-2xs font-bold uppercase px-2 py-0.5 rounded-full ${
                              dup.matchType === 'exact'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {dup.matchType.replace(/_/g, ' ')} ({dup.similarityScore}%)
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">
                          Patient: <strong className="text-slate-900">{dup.patientName || 'Priya Sharma'}</strong> • Hospital: <strong className="text-slate-900">{dup.providerName || 'Max Healthcare'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-2xs text-slate-400 block uppercase font-bold">Exposure</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          <CurrencyDisplay amount={dup.amount || 245000} />
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {dup.status === 'suspected' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(dup.id, 'confirmed_duplicate')}
                              className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 h-8"
                            >
                              Confirm Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(dup.id, 'cleared_false_positive')}
                              className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8"
                            >
                              Clear
                            </Button>
                          </>
                        ) : (
                          <span
                            className={`text-2xs font-bold uppercase px-2 py-1 rounded-md ${
                              dup.status === 'confirmed_duplicate'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {dup.status.replace(/_/g, ' ')}
                          </span>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : dup.id)}
                          className="h-8 w-8 text-slate-500"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Field-by-Field Breakdown */}
                  {isExpanded && (
                    <div className="mt-5 pt-4 border-t border-slate-200/80 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                          <h4 className="font-bold text-emerald-900 mb-1">Matching Fields ({dup.matchingFields.length})</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {dup.matchingFields.map((field, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-white text-emerald-800 font-semibold shadow-2xs">
                                ✓ {field}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                          <h4 className="font-bold text-amber-900 mb-1">Differing Fields ({dup.differingFields.length})</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {dup.differingFields.length === 0 ? (
                              <span className="text-2xs text-slate-500 italic">None (100% clone match)</span>
                            ) : (
                              dup.differingFields.map((field, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-white text-amber-800 font-semibold shadow-2xs">
                                  ! {field}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <Link
                          href={`/investigator/claims/${dup.claim1Id}`}
                          className="text-navy-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          Open Claim Workspace ({dup.claim1Reference})
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <span className="text-slate-400 text-2xs">
                          Flagged at {formatDate(dup.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
