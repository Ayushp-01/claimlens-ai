'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { patientAPI } from '@/lib/api';
import { Document } from '@/types';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const { toast } = useToast();

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const docs = await patientAPI.getDocuments();
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUploadNew = () => {
    toast({
      title: 'Upload documents from claim page',
      description: 'You can attach additional files on any active claim or during new claim submission.',
      type: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Repository</h1>
          <p className="text-sm text-slate-500">
            Secure vault of uploaded hospital invoices, test reports, and physician prescriptions.
          </p>
        </div>
        <Link href="/patient/claims/new">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Upload className="h-4 w-4" />
            Upload Supporting Bill
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Loading document repository..." />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents on file"
          description="You haven't uploaded any claim bills or medical records yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    {doc.verified ? (
                      <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        OCR Verified
                      </span>
                    ) : (
                      <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending OCR
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm mt-3 line-clamp-1" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                    {doc.documentType.replace(/_/g, ' ')} • {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                    <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                    <Link
                      href={`/patient/claims/${doc.claimId}`}
                      className="text-navy-700 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      View Claim
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 text-xs gap-1.5 border-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-navy-900 text-xs gap-1"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base truncate">{previewDoc?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Document Type: {previewDoc?.documentType.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-navy-600 mb-3" />
            <p className="text-sm font-semibold text-slate-900">{previewDoc?.name}</p>
            <p className="text-xs text-slate-500 mt-1">
              Encrypted Medical Document Preview Simulation
            </p>
            <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-2xs text-slate-600 max-w-sm text-left">
              <span className="font-bold block text-slate-800 mb-1">Extracted Metadata:</span>
              <div>Size: {(Number(previewDoc?.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</div>
              <div>MIME: {previewDoc?.mimeType}</div>
              <div>OCR Verification: {previewDoc?.verified ? 'Matched against hospital master' : 'Pending review'}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
