'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ShieldCheck, UserCheck, Building2, KeyRound, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const isDemoParam = searchParams.get('demo') === 'true';

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    initialRoleParam === 'investigator' || initialRoleParam === 'admin'
      ? 'investigator'
      : 'patient'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: selectedRole === 'patient' ? 'patient@claimlens.ai' : 'investigator@claimlens.ai',
      password: 'password123',
    },
  });

  useEffect(() => {
    if (initialRoleParam === 'investigator') {
      setSelectedRole('investigator');
      setValue('email', 'investigator@claimlens.ai');
    } else if (initialRoleParam === 'patient') {
      setSelectedRole('patient');
      setValue('email', 'patient@claimlens.ai');
    }
  }, [initialRoleParam, setValue]);

  const handleRoleTabChange = (role: string) => {
    const newRole = role as UserRole;
    setSelectedRole(newRole);
    if (newRole === 'patient') {
      setValue('email', 'patient@claimlens.ai');
    } else {
      setValue('email', 'investigator@claimlens.ai');
    }
    setValue('password', 'password123');
  };

  const handleQuickFill = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'patient') {
      setValue('email', 'patient@claimlens.ai');
    } else if (role === 'investigator') {
      setValue('email', 'investigator@claimlens.ai');
    } else if (role === 'admin') {
      setValue('email', 'admin@claimlens.ai');
    }
    setValue('password', 'password123');
    toast({
      title: `Loaded ${role} credentials`,
      description: 'Click "Sign In" to enter.',
      type: 'info',
    });
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password, selectedRole);
      toast({
        title: 'Authentication successful',
        description: `Welcome to ClaimLens AI.`,
        type: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Authentication failed',
        description: err.response?.data?.detail || 'Invalid email or password.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50/30 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-navy-800 flex items-center justify-center shadow-md">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-navy-950">
            Claim<span className="text-teal-600">Lens</span> AI
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Access the intelligent claims portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base text-center font-semibold text-slate-800">
              Select Portal Type
            </CardTitle>
            <div className="pt-2">
              <Tabs
                value={selectedRole === 'patient' ? 'patient' : 'investigator'}
                onValueChange={handleRoleTabChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="patient" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    Patient
                  </TabsTrigger>
                  <TabsTrigger value="investigator" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Investigator
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@claimlens.ai"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-xs text-slate-500">demo: password123</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-navy-800 hover:bg-navy-900 text-white font-medium"
                isLoading={isSubmitting}
              >
                Sign In to {selectedRole === 'patient' ? 'Patient' : 'Investigator'} Portal
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            {/* Demo Quick Fill Buttons */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Quick-Fill Demo Credentials
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill('patient')}
                  className="text-xs px-2 py-1 h-auto py-2 border-slate-200 hover:border-navy-400 hover:bg-navy-50"
                >
                  Patient
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill('investigator')}
                  className="text-xs px-2 py-1 h-auto py-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50"
                >
                  Investigator
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill('admin')}
                  className="text-xs px-2 py-1 h-auto py-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  Admin
                </Button>
              </div>
            </div>

            {selectedRole === 'patient' && (
              <p className="text-center text-xs text-slate-600 pt-2">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-teal-700 hover:underline">
                  Register as a new patient
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
          Loading authentication portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
