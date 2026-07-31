'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Plus, Send, Users, X } from 'lucide-react';

import { QuotationDetail } from '@/modules/cat/quotation/domain/quotation-types';
import { PublicationDetail, PublishedRevisionSummary } from '@/modules/cat/quotation/domain/revision-management-types';
import {
  DELIVERY_CHANNEL_LABELS,
  DeliveryChannel,
  DeliveryRecipientInput,
  ProposalDelivery,
  RelationshipContactOption,
} from '@/modules/cat/quotation/domain/proposal-delivery-types';
import { SnapshotViewerDialog } from '@/modules/cat/quotation/components/SnapshotViewerDialog';
import { CurrentPublishedRevisionPanel } from '@/modules/cat/quotation/components/CurrentPublishedRevisionPanel';
import { DeliveryHistoryList } from '@/modules/cat/quotation/components/DeliveryHistoryList';

interface CustomerDeliveryWorkspaceProps {
  quotation: QuotationDetail;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// QM-WP04B — Customer Delivery.
// Delivers the Current Published Revision only — never the Working Draft.
// Reuses SnapshotViewerDialog from Revision Management (QM-WP04C) for both
// previewing and, via its "Print / Save as PDF" action, the PDF Download
// channel — not duplicated here.
export function CustomerDeliveryWorkspace({ quotation }: CustomerDeliveryWorkspaceProps) {
  const [latestPublished, setLatestPublished] = useState<PublishedRevisionSummary | null | undefined>(undefined);
  const [contacts, setContacts] = useState<RelationshipContactOption[] | null>(null);
  const [history, setHistory] = useState<ProposalDelivery[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [manualRecipients, setManualRecipients] = useState<DeliveryRecipientInput[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualError, setManualError] = useState('');

  const [channel, setChannel] = useState<DeliveryChannel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPublication, setViewPublication] = useState<PublicationDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [revRes, contactsRes, historyRes] = await Promise.all([
          fetch(`/api/cat/quotations/${quotation.id}/revisions`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotation.id}/contacts`).then((r) => r.json()),
          fetch(`/api/cat/quotations/${quotation.id}/deliveries`).then((r) => r.json()),
        ]);
        if (revRes.success) {
          const revisions: PublishedRevisionSummary[] = revRes.publishedRevisions || [];
          setLatestPublished(revisions.length > 0 ? revisions[0] : null);
        }
        if (contactsRes.success) setContacts(contactsRes.contacts);
        if (historyRes.success) setHistory(historyRes.deliveries);
      } catch (err) {
        console.error('Failed to load Customer Delivery Workspace:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quotation.id]);

  useEffect(() => {
    setSubject(`Your Proposal — ${quotation.title} (${quotation.quotationNumber})`);
    setMessage(
      `Dear Customer,\n\nPlease find our proposal for ${quotation.title} below.\n\nWe look forward to the opportunity to work with you.\n\nBest regards.`,
    );
  }, [quotation.title, quotation.quotationNumber]);

  const refreshHistory = async () => {
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/deliveries`);
      const data = await res.json();
      if (data.success) setHistory(data.deliveries);
    } catch (err) {
      console.error('Failed to refresh Delivery History:', err);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const handleAddManualRecipient = () => {
    setManualError('');
    const name = manualName.trim();
    const email = manualEmail.trim();
    if (!name || !email || !EMAIL_PATTERN.test(email)) {
      setManualError('Enter a valid Name and Email address.');
      return;
    }
    setManualRecipients((prev) => [...prev, { name, email }]);
    setManualName('');
    setManualEmail('');
  };

  const removeManualRecipient = (index: number) => {
    setManualRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedRecipients: DeliveryRecipientInput[] = useMemo(() => {
    const fromContacts = (contacts || [])
      .filter((c) => selectedContactIds.has(c.id) && c.email)
      .map((c) => ({ name: c.name, email: c.email as string }));
    return [...fromContacts, ...manualRecipients];
  }, [contacts, selectedContactIds, manualRecipients]);

  const fetchPublication = async (revisionNumber: number): Promise<PublicationDetail | null> => {
    const res = await fetch(`/api/cat/quotations/${quotation.id}/publications/${revisionNumber}`);
    const data = await res.json();
    return data.success ? data.publication : null;
  };

  const handleViewSnapshot = async () => {
    if (!latestPublished) return;
    setViewOpen(true);
    setViewLoading(true);
    setViewPublication(null);
    try {
      setViewPublication(await fetchPublication(latestPublished.revisionNumber));
    } finally {
      setViewLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (selectedRecipients.length === 0) {
      setSendError('Select at least one recipient.');
      return;
    }
    if (channel === 'EMAIL' && (!subject.trim() || !message.trim())) {
      setSendError('Subject and Message are required for Email delivery.');
      return;
    }

    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      const res = await fetch(`/api/cat/quotations/${quotation.id}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          recipients: selectedRecipients,
          subject: channel === 'EMAIL' ? subject : undefined,
          message: channel === 'EMAIL' ? message : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendSuccess(
          channel === 'EMAIL'
            ? `Delivered to ${selectedRecipients.length} recipient${selectedRecipients.length === 1 ? '' : 's'}.`
            : 'Recorded. Opening the published snapshot — use Print / Save as PDF to download.',
        );
        await refreshHistory();
        if (channel === 'PDF_DOWNLOAD') {
          await handleViewSnapshot();
        }
      } else {
        setSendError(data.error || 'Failed to deliver.');
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to deliver.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading Customer Delivery...</div>;
  }

  return (
    <div className="space-y-4">
      <CurrentPublishedRevisionPanel
        latestPublished={latestPublished ?? null}
        onViewSnapshot={handleViewSnapshot}
        emptyMessage="No published revision yet. Publish this proposal first (Proposal Review → Publish Proposal) before it can be delivered to a customer."
      />

      {latestPublished && (
        <>
          {/* Recipient Selection */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Recipient Selection</h3>
            </div>
            <div className="p-5 space-y-4">
              {contacts && contacts.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Relationship Contacts</div>
                  <div className="divide-y divide-border/30 border border-border/30 rounded-xl overflow-hidden">
                    {contacts.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-2.5 bg-card ${c.email ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.has(c.id)}
                          disabled={!c.email}
                          onChange={() => toggleContact(c.id)}
                          className="w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{c.name}</span>
                            {c.isPrimary && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                Primary
                              </span>
                            )}
                            {c.role && <span className="text-[10px] text-muted-foreground">{c.role}</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{c.email || 'No email on file'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No contacts found on this quotation's Relationship.</p>
              )}

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Manual Recipients</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="Email"
                    className="flex-1 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualRecipient}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-muted/60 text-foreground text-xs font-bold rounded-lg cursor-pointer hover:bg-muted transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
                {manualError && <p className="text-[11px] text-rose-600 font-semibold">{manualError}</p>}
                {manualRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {manualRecipients.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted/50 text-foreground"
                      >
                        {r.name} &lt;{r.email}&gt;
                        <button type="button" onClick={() => removeManualRecipient(i)} className="cursor-pointer hover:text-rose-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? '' : 's'} selected.
              </div>
            </div>
          </div>

          {/* Delivery Composer */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-border/40 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Delivery Composer</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                {(Object.keys(DELIVERY_CHANNEL_LABELS) as DeliveryChannel[]).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                      channel === ch ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {DELIVERY_CHANNEL_LABELS[ch]}
                  </button>
                ))}
              </div>

              {channel === 'EMAIL' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">Message</label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Downloads a print-ready copy of Revision {latestPublished.revisionNumber} for the selected recipient(s), and
                  records the download in Delivery History.
                </p>
              )}

              {sendError && <p className="text-xs text-rose-600 font-semibold">{sendError}</p>}
              {sendSuccess && <p className="text-xs text-emerald-600 font-semibold">{sendSuccess}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDeliver}
                  disabled={sending || selectedRecipients.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Delivering...' : channel === 'EMAIL' ? 'Send Email' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <DeliveryHistoryList title="Delivery History" deliveries={history} emptyMessage="No deliveries yet." />

      <SnapshotViewerDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        publication={viewPublication}
        loading={viewLoading}
        quotationTitle={quotation.title}
        quotationNumber={quotation.quotationNumber}
      />
    </div>
  );
}
