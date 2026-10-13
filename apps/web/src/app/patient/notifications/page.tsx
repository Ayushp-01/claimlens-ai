'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { patientAPI } from '@/lib/api';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/utils';

export default function PatientNotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await patientAPI.getNotifications();
      setNotifications(res.items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAsRead = async (id: string, claimId?: string) => {
    await patientAPI.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (claimId) {
      router.push(`/patient/claims/${claimId}`);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast({
      title: 'All notifications marked as read',
      type: 'success',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications & Alerts</h1>
          <p className="text-sm text-slate-500">
            Real-time updates regarding claim validation, investigator notes, and settlement approvals.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="gap-1.5 border-slate-300 text-slate-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You are completely up to date. You will receive updates as your claims progress."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const icons = {
              success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
              warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
              info: <Info className="h-5 w-5 text-blue-600" />,
            };

            return (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id, item.claimId)}
                className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  item.isRead
                    ? 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                    : 'bg-white border-teal-200 shadow-xs ring-1 ring-teal-500/10'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    {icons[item.type as keyof typeof icons] || <Bell className="h-5 w-5 text-slate-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{item.message}</p>
                    <span className="text-2xs text-slate-400 mt-2 block">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-navy-700 text-xs shrink-0 gap-1">
                  View Claim
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
