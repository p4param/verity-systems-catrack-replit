'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Eye, FileEdit, History, Scale } from 'lucide-react';

import { QUOTATION_STATUS_LABELS } from '@/modules/cat/quotation/domain/quotation-types';
import {
  PublicationDetail,
  PublishedRevisionSummary,
  PUBLISHED_REVISION_STATUS_LABELS,
  WorkingDraftSummary,
} from '@/modules/cat/quotation/domain/revision-management-types';
import { compareProposalSnapshots, ComparisonGroup } from '@/modules/cat/quotation/domain/revision-comparison';
import { SnapshotViewerDialog } from '@/modules/cat/quotation/components/SnapshotViewerDialog';
import { RevisionComparisonDialog } from '@/modules/cat/quotation/components/RevisionComparisonDialog';

interface RevisionManagementWorkspaceProps {
  quotationId: string;
}

const MAX_COMPARE_SELECTION = 2;

// QM-WP04C — Revision Management Workspace.
// Business workspace for managing published proposal revisions, sitting on
// top of the publication model established in QM-WP04A without redesigning
// it: Working Draft (the current, editable revision), Published Revisions
// (reverse-chronological, publication-backed only), a read-only Snapshot
// Viewer, and business-level Comparison of two published revisions.
export function RevisionManagementWorkspace({ quotationId }: RevisionManagementWorkspaceProps) {
  const [workingDraft, setWorkingDraft] = useState<WorkingDraftSummary | null>(null);
  const [publishedRevisions, setPublishedRevisions] = useState<PublishedRevisionSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Title only — used to head the Printable Proposal Layout when a
  // snapshot is printed from here. Not otherwise part of this workspace's
  // own data.
  const [quotationTitle, setQuotationTitle] = useState<string | undefined>(undefined);
  const [quotationNumber, setQuotationNumber] = useState<string | undefined>(undefined);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPublication, setViewPublication] = useState<PublicationDetail | null>(null);

  const [compareSelected, setCompareSelected] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareGroups, setCompareGroups] = useState<ComparisonGroup[] | null>(null);

  useEffect(() => {
    if (!quotationId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [revRes, quotationRes] = await Promise.all([
          fetch(`/api/cat/quotations/${quotationId}/revisions`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotationId}`).then((r) => r.json()),
        ]);
        if (revRes.success) {
          setWorkingDraft(revRes.workingDraft);
          setPublishedRevisions(revRes.publishedRevisions);
        }
        if (quotationRes.success) {
          setQuotationTitle(quotationRes.quotation.title);
          setQuotationNumber(quotationRes.quotation.quotationNumber);
        }
      } catch (err) {
        console.error('Failed to load Revision Management Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotationId]);

  const fetchPublication = async (revisionNumber: number): Promise<PublicationDetail | null> => {
    const res = await fetch(`/api/cat/quotations/${quotationId}/publications/${revisionNumber}`);
    const data = await res.json();
    return data.success ? data.publication : null;
  };

  const handleViewSnapshot = async (revisionNumber: number) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewPublication(null);
    try {
      const publication = await fetchPublication(revisionNumber);
      setViewPublication(publication);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    } finally {
      setViewLoading(false);
    }
  };

  const toggleCompareSelection = (revisionNumber: number) => {
    setCompareSelected((prev) => {
      if (prev.includes(revisionNumber)) {
        return prev.filter((n) => n !== revisionNumber);
      }
      if (prev.length >= MAX_COMPARE_SELECTION) {
        return prev;
      }
      return [...prev, revisionNumber];
    });
  };

  const handleCompare = async () => {
    if (compareSelected.length !== MAX_COMPARE_SELECTION) return;
    const [revisionA, revisionB] = [...compareSelected].sort((a, b) => b - a);
    setCompareOpen(true);
    setCompareLoading(true);
    setCompareError('');
    setCompareGroups(null);
    try {
      const [pubA, pubB] = await Promise.all([fetchPublication(revisionA), fetchPublication(revisionB)]);
      if (!pubA || !pubB) {
        setCompareError('Failed to load one or both revisions for comparison.');
        return;
      }
      setCompareGroups(compareProposalSnapshots(pubA.snapshot, pubB.snapshot));
    } catch (err) {
      console.error('Failed to compare revisions:', err);
      setCompareError('Failed to compare revisions.');
    } finally {
      setCompareLoading(false);
    }
  };

  const [compareRevisionA, compareRevisionB] = [...compareSelected].sort((a, b) => b - a);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Revision Management...</div>;
  }

  // UX Polish — Publication Status banner: a glance-level summary derived
  // entirely from workingDraft + publishedRevisions (no new data, no new
  // API call). Enriched per Product Review: title, Revision N, Published
  // At, and Working Draft sync status as distinct lines rather than one
  // run-on sentence.
  const latestPublished = publishedRevisions && publishedRevisions.length > 0 ? publishedRevisions[0] : null;
  const publicationBanner = !latestPublished ? (
    <div className="flex items-start gap-3 bg-muted/40 border-2 border-border/40 rounded-2xl p-4 shadow-xs">
      <FileEdit className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="text-sm font-black text-foreground">Not Published Yet</div>
        <div className="text-xs text-muted-foreground">This quotation has never been published.</div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Working Draft:</span> Revision {workingDraft?.currentRevisionNumber ?? 0}{' '}
          (Unpublished)
        </div>
      </div>
    </div>
  ) : workingDraft?.hasUnpublishedChanges ? (
    <div className="flex items-start gap-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 shadow-xs">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="text-sm font-black text-amber-700">Current Published Revision</div>
        <div className="text-xs text-amber-700/90">Revision {latestPublished.revisionNumber}</div>
        <div className="text-xs text-amber-700/90">
          <span className="font-semibold">Published:</span> {new Date(latestPublished.publishedAt).toLocaleString()}
        </div>
        <div className="text-xs text-amber-700/90">
          <span className="font-semibold">Working Draft:</span> Unpublished Changes
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-3 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 shadow-xs">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="text-sm font-black text-emerald-700">Current Published Revision</div>
        <div className="text-xs text-emerald-700/90">Revision {latestPublished.revisionNumber}</div>
        <div className="text-xs text-emerald-700/90">
          <span className="font-semibold">Published:</span> {new Date(latestPublished.publishedAt).toLocaleString()}
        </div>
        <div className="text-xs text-emerald-700/90">
          <span className="font-semibold">Working Draft:</span> Synchronized
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {publicationBanner}

      {/* Working Draft */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-extrabold text-foreground">Working Draft</h3>
        </div>
        {workingDraft && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Draft Status</div>
              <div className="text-sm font-bold text-foreground">{QUOTATION_STATUS_LABELS[workingDraft.status] || workingDraft.status}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Last Modified</div>
              <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {new Date(workingDraft.lastModifiedAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Unpublished Changes</div>
              {workingDraft.hasUnpublishedChanges ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Unpublished Changes
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  No Unpublished Changes
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Published Revisions */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-extrabold text-foreground">Published Revisions</h3>
          </div>
          <button
            type="button"
            onClick={handleCompare}
            disabled={compareSelected.length !== MAX_COMPARE_SELECTION}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scale className="w-3.5 h-3.5" />
            Compare Selected ({compareSelected.length}/{MAX_COMPARE_SELECTION})
          </button>
        </div>

        <div className="p-5">
          {!publishedRevisions || publishedRevisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No published revisions yet.</p>
          ) : (
            <div className="divide-y divide-border/30 border border-border/30 rounded-xl overflow-hidden">
              {publishedRevisions.map((rev) => {
                const isSelected = compareSelected.includes(rev.revisionNumber);
                const selectionDisabled = !isSelected && compareSelected.length >= MAX_COMPARE_SELECTION;
                return (
                  <div key={rev.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={selectionDisabled}
                      onChange={() => toggleCompareSelection(rev.revisionNumber)}
                      className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed shrink-0"
                      aria-label={`Select Revision ${rev.revisionNumber} for comparison`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-foreground">Revision {rev.revisionNumber}</span>
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rev.status === 'CURRENT_PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border-border/40'
                          }`}
                        >
                          {PUBLISHED_REVISION_STATUS_LABELS[rev.status]}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Published {new Date(rev.publishedAt).toLocaleString()}
                        {rev.publishedBy ? ` by ${rev.publishedBy.fullName}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewSnapshot(rev.revisionNumber)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Snapshot
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SnapshotViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        publication={viewPublication}
        loading={viewLoading}
        quotationTitle={quotationTitle}
        quotationNumber={quotationNumber}
      />

      <RevisionComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        revisionA={compareRevisionA ?? null}
        revisionB={compareRevisionB ?? null}
        groups={compareGroups}
        loading={compareLoading}
        error={compareError}
      />
    </div>
  );
}
