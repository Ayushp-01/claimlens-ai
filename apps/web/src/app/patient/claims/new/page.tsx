'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Hospital,
  Receipt,
  Upload,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  RotateCcw,
  Calculator,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { patientAPI } from '@/lib/api';
import { Policy, ClaimSubmitData } from '@/types';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { useToast } from '@/components/ui/toast';
import { formatINR, formatDate } from '@/lib/utils';

interface LineItemForm {
  serviceDescription: string;
  billingCode?: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

export default function NewClaimPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Step 2 state
  const [providerName, setProviderName] = useState('Apollo Hospitals Bannerghatta');
  const [treatmentDate, setTreatmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [admissionDate, setAdmissionDate] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [treatmentDescription, setTreatmentDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billingCodes, setBillingCodes] = useState('CPT-47562, ICD-K80.20');

  // Step 3 state: line items
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      serviceDescription: 'Consultation & Clinical Evaluation',
      billingCode: 'CPT-99214',
      quantity: 1,
      unitAmount: 2500,
      totalAmount: 2500,
    },
    {
      serviceDescription: 'Hospital Diagnostic Lab Panel',
      billingCode: 'LAB-CHEM-01',
      quantity: 1,
      unitAmount: 8500,
      totalAmount: 8500,
    },
  ]);
  const [claimedAmountOverride, setClaimedAmountOverride] = useState<number | null>(null);

  // Step 4: Documents state
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadPolicies() {
      try {
        const pols = await patientAPI.getPolicies();
        setPolicies(pols);
        if (pols.length > 0) {
          setSelectedPolicyId(pols[0].id);
          setSelectedPolicy(pols[0]);
        }
      } catch (err) {
        console.error('Failed to load policies', err);
      }
    }
    loadPolicies();
  }, []);

  const handlePolicyChange = (polId: string) => {
    setSelectedPolicyId(polId);
    const p = policies.find((item) => item.id === polId) || null;
    setSelectedPolicy(p);
  };

  // Line items calculations
  const calculatedTotal = lineItems.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalAmountToClaim = claimedAmountOverride !== null ? claimedAmountOverride : calculatedTotal;

  // Dynamic Policy Coverage & Co-pay Computations
  const policyDeductible = selectedPolicy?.deductibleAmount || 0;
  const policyCopayPct = selectedPolicy?.copayPercentage || 0;
  const policyMaxCoverage = selectedPolicy?.remainingSum ?? selectedPolicy?.sumInsured ?? 1000000;

  const appliedDeductible = Math.min(totalAmountToClaim, policyDeductible);
  const amountSubjectToCopay = Math.max(0, totalAmountToClaim - appliedDeductible);
  const copayAmount = Math.round((amountSubjectToCopay * policyCopayPct) / 100);
  const eligibleBeforeLimit = Math.max(0, amountSubjectToCopay - copayAmount);
  const estimatedInsurerPayout = Math.min(eligibleBeforeLimit, policyMaxCoverage);
  const amountExceedingLimit = Math.max(0, eligibleBeforeLimit - policyMaxCoverage);
  const patientOutOfPocket = appliedDeductible + copayAmount + amountExceedingLimit;

  const handleLineItemChange = (index: number, field: keyof LineItemForm, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitAmount') {
      item.totalAmount = (Number(item.quantity) || 0) * (Number(item.unitAmount) || 0);
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        serviceDescription: '',
        billingCode: '',
        quantity: 1,
        unitAmount: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleFileUpload = (docType: string, file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size allowed is 10 MB.',
        type: 'error',
      });
      return;
    }
    setUploadedFiles((prev) => ({ ...prev, [docType]: file }));
    toast({
      title: 'File uploaded',
      description: `${file.name} ready for submission.`,
      type: 'success',
    });
  };

  // Step Validations
  const validateStep = (step: number): boolean => {
    setErrorMsg('');
    if (step === 1) {
      if (!selectedPolicy) {
        setErrorMsg('Please select an active insurance policy.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!providerName.trim()) {
        setErrorMsg('Provider/Hospital name is required.');
        return false;
      }
      if (!treatmentDate) {
        setErrorMsg('Treatment date is required.');
        return false;
      }
      if (admissionDate && dischargeDate && new Date(dischargeDate) < new Date(admissionDate)) {
        setErrorMsg('Discharge date must be on or after admission date.');
        return false;
      }
      if (!invoiceNumber.trim()) {
        setErrorMsg('Hospital invoice or bill number is required.');
        return false;
      }
      if (!treatmentDescription.trim()) {
        setErrorMsg('Please enter a brief treatment summary.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (lineItems.length === 0) {
        setErrorMsg('At least one billing line item is required.');
        return false;
      }
      const hasEmpty = lineItems.some((i) => !i.serviceDescription.trim() || i.totalAmount <= 0);
      if (hasEmpty) {
        setErrorMsg('All line items must have a description and an amount greater than 0.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (totalAmountToClaim > 50000 && !uploadedFiles['hospital_invoice']) {
        setErrorMsg('Hospital invoice is mandatory for claims above ₹50,000.');
        return false;
      }
      if (admissionDate && dischargeDate && !uploadedFiles['discharge_summary']) {
        setErrorMsg('Discharge summary is required for hospital in-patient admissions.');
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setErrorMsg('');
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const payload: ClaimSubmitData = {
        policyId: selectedPolicy?.id,
        policyNumber: selectedPolicy?.policyNumber || '',
        memberReference: selectedPolicy?.memberReference || '',
        providerName,
        treatmentDate,
        admissionDate: admissionDate || undefined,
        dischargeDate: dischargeDate || undefined,
        treatmentDescription,
        billingCodes: billingCodes ? billingCodes.split(',').map((s) => s.trim()) : [],
        invoiceNumber,
        claimedAmount: totalAmountToClaim,
        lineItems,
      };

      const created = await patientAPI.submitClaim(payload);

      toast({
        title: 'Claim Submitted Successfully',
        description: `Reference: ${created.referenceNumber}. Automated risk screening initiated.`,
        type: 'success',
      });

      router.push(`/patient/claims/${created.id}`);
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'An error occurred during submission.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Policy Info', icon: Shield },
    { number: 2, title: 'Treatment', icon: Hospital },
    { number: 3, title: 'Billing Lines', icon: Receipt },
    { number: 4, title: 'Documents', icon: Upload },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">File a Medical Reimbursement</h1>
        <p className="text-sm text-slate-500">
          Submit hospitalization and medical expenses with immediate automated invoice validation.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm transition-all ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isCurrent
                      ? 'bg-navy-800 text-white shadow-md'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isCurrent ? 'text-navy-950 font-bold' : isCompleted ? 'text-teal-700' : 'text-slate-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Policy Selection */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle>Step 1: Select Insurance Policy</CardTitle>
            <CardDescription>
              Choose from your active healthcare insurance policies to verify eligible reimbursement limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Active Insurance Schedule ({policies.length} Policies Available)</Label>
              <select
                value={selectedPolicyId}
                onChange={(e) => handlePolicyChange(e.target.value)}
                className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-600 truncate"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.insurerName} — {p.policyNumber} ({p.policyType}) | Sum: ₹{(p.sumInsured || 0).toLocaleString('en-IN')} | Co-pay: {p.copayPercentage ?? 0}% | TPA: {p.tpaName || 'In-House'}
                  </option>
                ))}
              </select>
            </div>

            {selectedPolicy && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="font-bold text-navy-950 text-base">{selectedPolicy.insurerName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedPolicy.policyType}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-2xs font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                    Active Coverage
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Policy Number</span>
                    <span className="font-mono font-bold text-navy-900">{selectedPolicy.policyNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Member Reference</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedPolicy.memberReference}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">TPA Administrator</span>
                    <span className="font-semibold text-slate-800">{selectedPolicy.tpaName || 'In-House TPA Desk'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Coverage Period</span>
                    <span className="text-slate-700">
                      {formatDate(selectedPolicy.validFrom)} to {formatDate(selectedPolicy.validTo)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-dashed border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Total Sum Insured</span>
                    <span className="font-mono font-bold text-slate-900">
                      <CurrencyDisplay amount={selectedPolicy.sumInsured} />
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Remaining Sum</span>
                    <span className="font-mono font-bold text-teal-700">
                      <CurrencyDisplay amount={selectedPolicy.remainingSum} />
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Co-pay Requirement</span>
                    <span className="font-semibold text-slate-800">
                      {selectedPolicy.copayPercentage !== undefined ? `${selectedPolicy.copayPercentage}%` : '0%'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Annual Deductible</span>
                    <span className="font-semibold text-slate-800">
                      <CurrencyDisplay amount={selectedPolicy.deductibleAmount || 0} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Treatment Information */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle>Step 2: Hospital & Treatment Details</CardTitle>
            <CardDescription>Enter provider and hospital bill details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="providerName">Hospital / Provider Name</Label>
              <Input
                id="providerName"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. Apollo Hospitals Bannerghatta"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="treatmentDate">Treatment / Consultation Date *</Label>
                <Input
                  id="treatmentDate"
                  type="date"
                  value={treatmentDate}
                  onChange={(e) => setTreatmentDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date (Optional)</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dischargeDate">Discharge Date (Optional)</Label>
                <Input
                  id="dischargeDate"
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Hospital Invoice / Bill # *</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. APO-BLR-2026-4412"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCodes">Billing Codes (CPT / ICD - Optional)</Label>
                <Input
                  id="billingCodes"
                  value={billingCodes}
                  onChange={(e) => setBillingCodes(e.target.value)}
                  placeholder="CPT-47562, ICD-K80.20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatmentDescription">Clinical Diagnosis & Treatment Summary *</Label>
              <textarea
                id="treatmentDescription"
                rows={3}
                value={treatmentDescription}
                onChange={(e) => setTreatmentDescription(e.target.value)}
                placeholder="Describe illness, surgical procedure, and medical interventions..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-navy-600 focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Billing Information */}
      {currentStep === 3 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle>Step 3: Itemized Hospital Line Items</CardTitle>
            <CardDescription>
              Break down the hospital invoice line items for automated tariff verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-800 uppercase">
                      Line Item #{index + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:bg-red-50 h-7 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1">
                      <Label className="text-xs">Service / Procedure Description *</Label>
                      <Input
                        value={item.serviceDescription}
                        onChange={(e) => handleLineItemChange(index, 'serviceDescription', e.target.value)}
                        placeholder="e.g. Laparoscopic Surgical Procedure"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Code</Label>
                      <Input
                        value={item.billingCode || ''}
                        onChange={(e) => handleLineItemChange(index, 'billingCode', e.target.value)}
                        placeholder="CPT-47562"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Unit Rate (₹)</Label>
                      <Input
                        type="number"
                        value={item.unitAmount}
                        onChange={(e) => handleLineItemChange(index, 'unitAmount', parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-semibold text-slate-700">
                    Subtotal: <span className="font-mono text-slate-900">{formatINR(item.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="w-full gap-2 border-dashed border-slate-300 hover:border-navy-500"
            >
              <Plus className="h-4 w-4" />
              Add Another Line Item
            </Button>

            {/* Editable Claimed Amount & Dynamic Policy Breakdown */}
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label htmlFor="claimedAmountInput" className="text-sm font-bold text-slate-900">
                      Total Claimed Amount (₹) *
                    </Label>
                    <p className="text-xs text-slate-500">
                      Sum of itemized billing lines: {formatINR(calculatedTotal)}. You can also adjust or override this total directly.
                    </p>
                  </div>
                  {claimedAmountOverride !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClaimedAmountOverride(null)}
                      className="text-xs h-8 text-teal-700 border-teal-200 hover:bg-teal-50 gap-1.5 self-start sm:self-auto"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Sync with Line Items ({formatINR(calculatedTotal)})
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base">
                    ₹
                  </span>
                  <Input
                    id="claimedAmountInput"
                    type="number"
                    min="0"
                    step="any"
                    value={claimedAmountOverride !== null ? claimedAmountOverride : calculatedTotal}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setClaimedAmountOverride(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="pl-8 h-12 text-lg font-bold font-mono text-navy-950 border-slate-300 focus:border-navy-600"
                    placeholder="Enter claimed total in ₹"
                  />
                </div>
              </div>

              {/* Dynamic Real-Time Coverage & Co-Pay Estimation Widget */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-teal-50/60 to-slate-50 border border-teal-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Dynamic Policy Coverage & Co-Pay Breakdown
                      </h4>
                      <p className="text-2xs text-slate-500">
                        Real-time computation based on {selectedPolicy?.insurerName || 'selected policy'} rules
                      </p>
                    </div>
                  </div>
                  <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Live Calculation
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-2xs text-slate-400 block font-medium">Claimed Total</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatINR(totalAmountToClaim)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-2xs text-slate-400 block font-medium">
                      Deductible Applied ({formatINR(policyDeductible)})
                    </span>
                    <span className="font-mono font-semibold text-rose-600 text-sm">
                      - {formatINR(appliedDeductible)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-2xs text-slate-400 block font-medium">
                      Co-pay Share ({policyCopayPct}%)
                    </span>
                    <span className="font-mono font-semibold text-amber-600 text-sm">
                      - {formatINR(copayAmount)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <span className="text-2xs text-slate-400 block font-medium">Remaining Sum Limit</span>
                    <span className="font-mono font-semibold text-slate-700 text-sm">
                      {formatINR(policyMaxCoverage)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-teal-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                  <div>
                    <span className="text-2xs uppercase tracking-wider font-bold text-teal-200 block">
                      Estimated Insurer Payout
                    </span>
                    <span className="text-xl font-extrabold font-mono text-white">
                      {formatINR(estimatedInsurerPayout)}
                    </span>
                    <p className="text-2xs text-teal-200 mt-0.5">
                      Subject to clinical adjudication and tariff verification
                    </p>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-teal-800 pt-2 sm:pt-0 sm:pl-4">
                    <span className="text-2xs uppercase tracking-wider font-bold text-teal-300 block">
                      Estimated Patient Share
                    </span>
                    <span className="text-base font-bold font-mono text-teal-100">
                      {formatINR(patientOutOfPocket)}
                    </span>
                    <span className="text-2xs text-teal-300 block">
                      (Deductible + Co-pay + Overages)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Documents & Review */}
      {currentStep === 4 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle>Step 4: Supporting Documents & Final Review</CardTitle>
            <CardDescription>
              Upload hospital invoices, discharge summaries, and prescriptions (PDF, JPG, PNG up to 10MB).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document 1: Hospital Invoice */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">
                    Hospital Final Invoice{' '}
                    {totalAmountToClaim > 50000 && <span className="text-red-500">*</span>}
                  </Label>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Official itemized hospital bill.</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('hospital_invoice', e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                />
                {uploadedFiles['hospital_invoice'] && (
                  <span className="text-2xs text-emerald-700 font-semibold block">
                    ✓ {uploadedFiles['hospital_invoice'].name}
                  </span>
                )}
              </div>

              {/* Document 2: Discharge Summary */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">
                    Discharge Summary{' '}
                    {admissionDate && dischargeDate && <span className="text-red-500">*</span>}
                  </Label>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Signed summary from treating doctor.</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('discharge_summary', e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                />
                {uploadedFiles['discharge_summary'] && (
                  <span className="text-2xs text-emerald-700 font-semibold block">
                    ✓ {uploadedFiles['discharge_summary'].name}
                  </span>
                )}
              </div>

              {/* Document 3: Pharmacy Bills */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Pharmacy & Diagnostic Bills</Label>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Lab test reports, radiology, medicine bills.</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('medical_bills', e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                />
                {uploadedFiles['medical_bills'] && (
                  <span className="text-2xs text-emerald-700 font-semibold block">
                    ✓ {uploadedFiles['medical_bills'].name}
                  </span>
                )}
              </div>

              {/* Document 4: Doctor's Prescription */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Doctor Prescription</Label>
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Treating physician prescription or referral.</p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('prescription', e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                />
                {uploadedFiles['prescription'] && (
                  <span className="text-2xs text-emerald-700 font-semibold block">
                    ✓ {uploadedFiles['prescription'].name}
                  </span>
                )}
              </div>
            </div>

            {/* Final Submission Summary */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-navy-950">Claim Summary & Policy Assessment</h4>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                  Ready for Validation
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Policy & Insurer:</span>
                  <span className="font-semibold text-slate-900">{selectedPolicy?.insurerName}</span>
                  <span className="text-2xs font-mono text-slate-500 block">{selectedPolicy?.policyNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TPA Administrator:</span>
                  <span className="font-semibold text-slate-900">{selectedPolicy?.tpaName || 'In-House TPA'}</span>
                  <span className="text-2xs text-slate-500 block">{selectedPolicy?.copayPercentage || 0}% co-pay applied</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Hospital / Invoice:</span>
                  <span className="font-semibold text-slate-900 truncate block">{providerName}</span>
                  <span className="text-2xs font-mono text-slate-500 block">#{invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Claimed:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatINR(totalAmountToClaim)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="text-2xs text-slate-400 block font-medium">Applied Deductible & Co-pay</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatINR(appliedDeductible + copayAmount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                  <span className="text-2xs text-teal-700 block font-medium">Estimated Insurer Payout</span>
                  <span className="font-mono font-bold text-teal-900 text-sm">
                    {formatINR(estimatedInsurerPayout)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-2xs text-slate-500 block font-medium">Estimated Patient Out-of-Pocket</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatINR(patientOutOfPocket)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {currentStep > 1 ? (
          <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <Button type="button" onClick={nextStep} className="bg-navy-800 hover:bg-navy-900 text-white gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2 shadow-md"
          >
            Submit Claim for AI Validation
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
