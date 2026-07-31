'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { RevisionManagementWorkspace } from '@/modules/cat/quotation/components/RevisionManagementWorkspace';

// QM-WP04C — Revision Management.
// Reached from Proposal Review's "Go to Revisions" action after Publish.
export default function QuotationRevisionsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      <button
        type="button"
        onClick={() => router.push(`/cat/quotations/${id}`)}
        className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Quotation Workspace</span>
      </button>

      {id && <RevisionManagementWorkspace quotationId={id} />}
    </div>
  );
}
