'use client';

import React, { useEffect, useState } from 'react';
import {
  User,
  Shield,
  Plus,
  Save,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { patientAPI } from '@/lib/api';
import { PatientProfile, Policy, PolicyData } from '@/types';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { LoadingState } from '@/components/shared/LoadingState';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientProfilePage() {
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Add Policy modal state
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState<PolicyData>({
    policyNumber: '',
    memberReference: '',
    insurerName: 'Care Health Insurance',
    policyType: 'Comprehensive Health Plan',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 365 * 864e5).toISOString().split('T')[0],
    sumInsured: 1000000,
    copayPercentage: 0,
    deductibleAmount: 0,
    tpaName: 'MediAssist TPA',
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await patientAPI.getProfile();
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setDateOfBirth(data.dateOfBirth || '');
      setPolicies(data.policies || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await patientAPI.updateProfile({
        name,
        phone,
        address,
        dateOfBirth,
      });
      setProfile(updated);
      // Synchronize auth state so navigation, sidebar, and headers update immediately
      updateUser({
        name: updated.name || name,
        phone: updated.phone || phone,
        address: updated.address || address,
        dateOfBirth: updated.dateOfBirth || dateOfBirth,
      });
      toast({
        title: 'Profile Updated',
        description: 'Your patient account information has been saved.',
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Unable to update profile.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.policyNumber || !newPolicy.memberReference) {
      toast({
        title: 'Missing Details',
        description: 'Policy Number and Member ID are required.',
        type: 'error',
      });
      return;
    }

    try {
      const created = await patientAPI.createPolicy(newPolicy);
      setPolicies([...policies, created]);
      setShowAddPolicy(false);
      toast({
        title: 'Insurance Policy Linked',
        description: `Policy ${created.policyNumber} is now active for claims.`,
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to add policy',
        description: err.message,
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading profile and policies..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Profile & Coverage</h1>
        <p className="text-sm text-slate-500">
          Manage contact details, government ID records, and linked health insurance policies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Profile Form */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-20 w-20 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center font-bold text-2xl shadow-inner mb-2">
                {name ? name[0] : 'P'}
              </div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-xs">{profile?.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                  <Input
                    id="fullName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-xs">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs">Residential Address</Label>
                  <textarea
                    id="address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-navy-600 focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSaving}
                  className="w-full bg-navy-800 hover:bg-navy-900 text-white gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Insurance Policies */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Linked Insurance Policies</h2>
              <p className="text-xs text-slate-500">Active health insurance schedules available for claim filing</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddPolicy(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Add Policy
            </Button>
          </div>

          <div className="space-y-4">
            {policies.map((pol) => (
              <Card key={pol.id} className="border-slate-200 hover:border-slate-300 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{pol.insurerName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{pol.policyType}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      <CheckCircle2 className="h-3 w-3" />
                      {pol.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Policy #</span>
                      <span className="font-mono font-semibold text-navy-900">{pol.policyNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Member Ref</span>
                      <span className="font-mono font-medium text-slate-800">{pol.memberReference}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Sum Insured</span>
                      <span className="font-mono font-bold text-slate-900">
                        <CurrencyDisplay amount={pol.sumInsured} />
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Remaining Sum</span>
                      <span className="font-mono font-bold text-teal-700">
                        <CurrencyDisplay amount={pol.remainingSum} />
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-slate-100 grid grid-cols-3 gap-2 text-2xs">
                    <div>
                      <span className="text-slate-400 block font-medium">TPA Administrator</span>
                      <span className="font-semibold text-slate-700">{pol.tpaName || 'In-House TPA'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Co-pay</span>
                      <span className="font-semibold text-slate-700">{pol.copayPercentage !== undefined ? `${pol.copayPercentage}%` : '0%'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Annual Deductible</span>
                      <span className="font-semibold text-slate-700"><CurrencyDisplay amount={pol.deductibleAmount || 0} /></span>
                    </div>
                  </div>

                  <div className="mt-3 text-2xs text-slate-500">
                    Validity: {formatDate(pol.validFrom)} through {formatDate(pol.validTo)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Add Policy Dialog */}
      <Dialog open={showAddPolicy} onOpenChange={setShowAddPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Health Insurance Policy</DialogTitle>
            <DialogDescription>
              Enter the insurer policy card details to enable reimbursement requests.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Insurer Company Name</Label>
              <Input
                value={newPolicy.insurerName}
                onChange={(e) => setNewPolicy({ ...newPolicy, insurerName: e.target.value })}
                placeholder="Star Health / HDFC ERGO / Care"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Policy Type / Plan Name</Label>
              <Input
                value={newPolicy.policyType}
                onChange={(e) => setNewPolicy({ ...newPolicy, policyType: e.target.value })}
                placeholder="Comprehensive Floater Shield"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Policy Number</Label>
                <Input
                  value={newPolicy.policyNumber}
                  onChange={(e) => setNewPolicy({ ...newPolicy, policyNumber: e.target.value })}
                  placeholder="STAR-2026-901"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Member ID / Reference</Label>
                <Input
                  value={newPolicy.memberReference}
                  onChange={(e) => setNewPolicy({ ...newPolicy, memberReference: e.target.value })}
                  placeholder="MEM-4491"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sum Insured (₹)</Label>
                <Input
                  type="number"
                  value={newPolicy.sumInsured}
                  onChange={(e) => setNewPolicy({ ...newPolicy, sumInsured: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Co-pay (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newPolicy.copayPercentage ?? 0}
                  onChange={(e) => setNewPolicy({ ...newPolicy, copayPercentage: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Deductible (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newPolicy.deductibleAmount ?? 0}
                  onChange={(e) => setNewPolicy({ ...newPolicy, deductibleAmount: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">TPA Administrator</Label>
              <Input
                value={newPolicy.tpaName ?? ''}
                onChange={(e) => setNewPolicy({ ...newPolicy, tpaName: e.target.value })}
                placeholder="MediAssist TPA / Vidal Health / Heritage"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valid From</Label>
                <Input
                  type="date"
                  value={newPolicy.validFrom}
                  onChange={(e) => setNewPolicy({ ...newPolicy, validFrom: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valid To</Label>
                <Input
                  type="date"
                  value={newPolicy.validTo}
                  onChange={(e) => setNewPolicy({ ...newPolicy, validTo: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddPolicy(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreatePolicy} className="bg-teal-600 hover:bg-teal-700 text-white">
              Link Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
