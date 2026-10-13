'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building2,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  Upload,
  CheckCircle2,
  Receipt,
  Download,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { patientAPI } from '@/lib/api';
import { ClaimDetail, ClaimStatus } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useToast } from '@/components/ui/toast';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';

const PROGRESS_STEPS: { key: ClaimStatus; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'validation', label: 'Validation' },
  { key: 'risk_screening', label: 'Risk Screening' },
  { key: 'under_review', label: 'Review' },
  { key: 'approved', label: 'Decision' },
  { key: 'payment_processing', label: 'Payment' },
  { key: 'settled', label: 'Settled' },
];

export default function PatientClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.claimId as string;
  const { toast } = useToast();

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);

  const fetchClaimDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await patientAPI.getClaim(claimId);
      setClaim(data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve claim details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimDetail();
  }, [claimId]);

  const handleRespondToDocRequest = async (requestId: string) => {
    setFulfillingRequestId(requestId);
    try {
      await patientAPI.fulfillDocumentRequest(requestId);
      toast({
        title: 'Document Request Responded',
        description: 'Uploaded documents transmitted to the claim assessment desk.',
        type: 'success',
      });
      fetchClaimDetail();
    } finally {
      setFulfillingRequestId(null);
    }
  };

  if (isLoading) {
    return <LoadingState message="Fetching claim details..." />;
  }

  if (error || !claim) {
    return (
      <ErrorState
        title="Claim Not Found"
        message={error || 'The requested claim could not be located.'}
        onRetry={fetchClaimDetail}
      />
    );
  }

  // Determine current timeline progress index
  const getStepStatus = (stepKey: ClaimStatus) => {
    if (claim.status === 'rejected') {
      if (['submitted', 'validation', 'risk_screening', 'under_review'].includes(stepKey)) {
        return 'completed';
      }
      if (stepKey === 'approved') {
        return 'rejected';
      }
      return 'disabled';
    }

    if (claim.status === 'settled') {
      return 'completed';
    }

    const statusOrder: ClaimStatus[] = [
      'submitted',
      'validation',
      'risk_screening',
      'under_review',
      'documentation_requested',
      'approved',
      'partially_approved',
      'payment_processing',
      'settled',
    ];
    const currentIndex = statusOrder.indexOf(claim.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex <= currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back button and header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/patient/claims">
            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {claim.referenceNumber}
              </h1>
              <StatusBadge status={claim.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitted on {formatDateTime(claim.createdAt)}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block uppercase font-medium">Claim Amount</span>
          <span className="text-2xl font-extrabold text-navy-950 font-mono">
            <CurrencyDisplay amount={claim.claimedAmount} />
          </span>
        </div>
      </div>

      {/* Prominent Rejection Banner if rejected */}
      {claim.status === 'rejected' && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/90 shadow-xs flex items-start gap-3.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-900">Rejected - Investigation Closed</h3>
            <p className="text-xs text-rose-800 leading-relaxed">
              {claim.rejectionReason || claim.statusExplanations || 'Claim not approved following adjudicator review. Approved payout is ₹0.00.'}
            </p>
          </div>
        </div>
      )}

      {/* Visual Timeline Stepper */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Settlement Progress</CardTitle>
          <CardDescription>Visual tracker of your claim verification lifecycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto py-2">
            {PROGRESS_STEPS.map((step, idx) => {
              const status = getStepStatus(step.key);
              const isCompleted = status === 'completed';
              const isRejected = status === 'rejected';
              const isCurrent = status === 'current';
              const isDisabled = status === 'disabled';

              return (
                <div key={step.key} className="flex flex-col items-center flex-1 min-w-[70px] text-center relative">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-teal-600 text-white'
                        : isRejected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-2 ring-amber-200'
                        : isDisabled
                        ? 'bg-slate-50 text-slate-300 border border-slate-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isRejected ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-2xs font-medium ${
                      isCompleted
                        ? 'text-teal-800 font-semibold'
                        : isRejected
                        ? 'text-rose-700 font-bold'
                        : isCurrent
                        ? 'text-amber-800 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {isRejected ? 'Rejected' : step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Friendly explanation */}
          <div className="mt-4 p-3 rounded-xl bg-navy-50/70 border border-navy-100 flex items-start gap-3">
            <Info className="h-4 w-4 text-navy-700 shrink-0 mt-0.5" />
            <p className="text-xs text-navy-900 leading-relaxed">
              {claim.statusExplanations ||
                'Your claim is progressing through our automated verification engine. All itemized hospital charges are matched against your policy schedule.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Document Requests Alert (if any) */}
      {claim.documentRequests && claim.documentRequests.length > 0 && (
        <div className="space-y-3">
          {claim.documentRequests.map((req) => (
            <div
              key={req.id}
              className="p-5 rounded-xl border border-amber-300 bg-amber-50/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    Additional Documents Requested by Review Desk
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">{req.message}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {req.documentTypes.map((type, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-900 border border-amber-200 capitalize"
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {req.status === 'pending' ? (
                <Button
                  onClick={() => handleRespondToDocRequest(req.id)}
                  isLoading={fulfillingRequestId === req.id}
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800 text-white shrink-0 gap-1.5"
                >
                  <Upload className="h-4 w-4" />
                  Upload & Resolve
                </Button>
              ) : (
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Fulfilled
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grid: Overview & Hospital Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800">Hospital & Treatment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Hospital / Provider</span>
              <span className="font-semibold text-slate-900">{claim.providerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Invoice Number</span>
              <span className="font-mono font-semibold text-navy-900">{claim.invoiceNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Treatment Date</span>
              <span className="text-slate-900">{formatDate(claim.treatmentDate)}</span>
            </div>
            {claim.admissionDate && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Admission / Discharge</span>
                <span className="text-slate-900">
                  {formatDate(claim.admissionDate)} — {formatDate(claim.dischargeDate)}
                </span>
              </div>
            )}
            <div className="pt-2">
              <span className="text-xs text-slate-500 block mb-1">Clinical Summary</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {claim.treatmentDescription}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-800">Policy & Settlement Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Policy Number</span>
              <span className="font-mono font-semibold text-slate-900">{claim.policyNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Member ID</span>
              <span className="font-mono text-slate-800">{claim.memberReference}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">TPA Administrator</span>
              <span className="font-medium text-slate-800">{claim.tpaName || 'In-House TPA Desk'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Policy Co-pay / Deductible</span>
              <span className="font-medium text-slate-800">
                {claim.copayPercentage !== undefined ? `${claim.copayPercentage}%` : '0%'} Co-pay | {formatINR(claim.deductibleAmount || 0)} Deductible
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Claimed</span>
              <span className="font-mono font-bold text-slate-900">{formatINR(claim.claimedAmount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Approved Amount</span>
              <span className={`font-mono font-bold ${claim.status === 'rejected' ? 'text-rose-700' : 'text-teal-700'}`}>
                {claim.status === 'rejected'
                  ? '₹0.00 (Rejected)'
                  : claim.approvedAmount !== undefined && claim.approvedAmount !== null
                  ? formatINR(claim.approvedAmount)
                  : claim.status === 'settled'
                  ? formatINR(claim.claimedAmount)
                  : 'Pending Review'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Disbursed / Settled</span>
              <span className={`font-mono font-bold ${claim.status === 'rejected' ? 'text-slate-400' : 'text-emerald-700'}`}>
                {claim.status === 'rejected'
                  ? '₹0.00'
                  : claim.settledAmount !== undefined && claim.settledAmount !== null
                  ? `${formatINR(claim.settledAmount)} (Completed)`
                  : claim.status === 'settled'
                  ? `${formatINR(claim.approvedAmount || claim.claimedAmount)} (Completed)`
                  : 'Pending Disbursement'}
              </span>
            </div>
            {claim.rejectionReason && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <span className="text-xs text-rose-700 font-bold block mb-1">Rejection Rationale</span>
                <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {claim.rejectionReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Itemized Line Items Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Itemized Billing Lines</CardTitle>
          <CardDescription>Individual charges extracted and assessed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Service / Procedure</th>
                  <th className="px-4 py-3">Billing Code</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Rate</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claim.lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.serviceDescription}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.billingCode || '-'}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatINR(item.unitAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatINR(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase text-slate-600">
                    Total Claimed
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-navy-950">
                    {formatINR(claim.claimedAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">Submitted Documents</CardTitle>
          <CardDescription>Verification certificates and hospital bills on file</CardDescription>
        </CardHeader>
        <CardContent>
          {claim.documents.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No attachments uploaded for this claim.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {claim.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{doc.name}</p>
                      <p className="text-2xs text-slate-500 capitalize">
                        {doc.documentType.replace(/_/g, ' ')} • {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-navy-900">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
