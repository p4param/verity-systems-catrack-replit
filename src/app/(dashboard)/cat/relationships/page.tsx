'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Building2, 
  UserCheck, 
  Briefcase, 
  Flame, 
  Sun, 
  Snowflake,
  ChevronRight,
  Plus,
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';

interface RelationshipItem {
  id: string;
  relationshipNumber: string;
  name: string;
  type: string;
  status: string;
  rating?: string;
  source?: string;
  owner?: string;
  contactsCount?: number;
  notesCount?: number;
  primaryContactName?: string;
  primaryContactEmail?: string;
  createdAt: string;
}

export default function RelationshipsDirectoryDashboardPage() {
  const router = useRouter();
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Quick Create Drawer State
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('ORGANIZATION');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advisory Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<any[] | null>(null);

  const fetchRelationships = async (searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/cat/relationships?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setRelationships(data.items || []);
      } else {
        console.error('Relationships API error:', data);
      }
    } catch (err) {
      console.error('Failed to fetch relationships:', err);
    } finally {
      setLoading(false);
    }
  };


  // Instant Debounced Search (300ms) - Item 1.1
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRelationships(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query, statusFilter, typeFilter]);

  const handleCreateSubmit = async (allowDuplicates = false) => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cat/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          type: newType,
          primaryContact: contactName ? { name: contactName, email: contactEmail, phone: contactPhone, role: contactRole } : undefined,
          allowDuplicates,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.isWarning && data.matches) {
        setDuplicateWarning(data.matches);
        setIsSubmitting(false);
        return;
      }

      if (data.success && data.relationship?.id) {
        setShowCreateDrawer(false);
        setDuplicateWarning(null);
        resetForm();
        router.push(`/cat/relationships/${data.relationship.id}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error creating relationship: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewType('ORGANIZATION');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactRole('');
    setDuplicateWarning(null);
  };

  // Metrics Calculation
  const totalCount = relationships.length;
  const prospectsCount = relationships.filter(r => r.status === 'PROSPECT' || r.status === 'LEAD').length;
  const customersCount = relationships.filter(r => r.status === 'CUSTOMER').length;
  const qualifiedCount = relationships.filter(r => r.status === 'QUALIFIED').length;

  return (
    <div className="space-y-5">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-2xl border border-border/40 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-0.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Commercial Relationship Management</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Relationship Directory</h1>
        </div>

        <button
          onClick={() => { resetForm(); setShowCreateDrawer(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Quick Create Relationship</span>
        </button>
      </div>

      {/* Item 1.3: Compact KPI Cards (Height reduced ~25%, emphasis on number + label) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card py-2.5 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold text-foreground tracking-tight">{totalCount}</div>
            <div className="text-[11px] font-medium text-muted-foreground">Relationships</div>
          </div>
          <Users className="w-4 h-4 text-primary/70" />
        </div>

        <div className="bg-card py-2.5 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">{prospectsCount}</div>
            <div className="text-[11px] font-medium text-muted-foreground">Prospects & Leads</div>
          </div>
          <Clock className="w-4 h-4 text-amber-500/70" />
        </div>

        <div className="bg-card py-2.5 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{customersCount}</div>
            <div className="text-[11px] font-medium text-muted-foreground">Active Customers</div>
          </div>
          <UserCheck className="w-4 h-4 text-emerald-500/70" />
        </div>

        <div className="bg-card py-2.5 px-4 rounded-xl border border-border/40 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">{qualifiedCount}</div>
            <div className="text-[11px] font-medium text-muted-foreground">Qualified Accounts</div>
          </div>
          <TrendingUp className="w-4 h-4 text-indigo-500/70" />
        </div>
      </div>

      {/* Item 1.1: Instant Debounced Search Bar & Filters */}
      <div className="bg-card p-3 rounded-xl border border-border/40 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Type to search name, REL number, contact..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-muted/30 border border-border/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg border border-border/40 text-xs">
            <span className="text-[10px] text-muted-foreground font-medium px-2">Status:</span>
            {['', 'LEAD', 'PROSPECT', 'QUALIFIED', 'CUSTOMER', 'INACTIVE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === '' ? 'All' : st}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-muted/30 border border-border/40 rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-hidden cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
      </div>

      {/* Item 1.2: Directory Table with Clean Full-Row Click Navigation (No Open Workspace button) */}
      <div className="bg-card rounded-2xl border border-border/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading Relationship Directory...
          </div>
        ) : relationships.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-foreground">No Relationships Found</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
              No commercial relationships match your search query.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-2.5 bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4 sm:col-span-4">Relationship</div>
              <div className="col-span-3 sm:col-span-3">Type</div>
              <div className="col-span-3 sm:col-span-3">Primary Contact</div>
              <div className="col-span-2 sm:col-span-2 text-right">Lifecycle Stage</div>
            </div>

            {/* Item 1.2: Clickable Table Rows */}
            {relationships.map((rel) => (
              <div
                key={rel.id}
                onClick={() => router.push(`/cat/relationships/${rel.id}`)}
                className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors duration-150 cursor-pointer group"
              >
                {/* Relationship Name & Number */}
                <div className="col-span-4 sm:col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded">
                      {rel.relationshipNumber}
                    </span>
                    {rel.type === 'ORGANIZATION' ? (
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                      {rel.name}
                    </span>
                  </div>
                </div>

                {/* Type */}
                <div className="col-span-3 sm:col-span-3 text-xs text-muted-foreground capitalize">
                  {rel.type.toLowerCase()}
                </div>

                {/* Primary Contact */}
                <div className="col-span-3 sm:col-span-3 text-xs">
                  {rel.primaryContactName ? (
                    <div className="truncate">
                      <span className="font-medium text-foreground">{rel.primaryContactName}</span>
                      {rel.primaryContactEmail && (
                        <span className="text-[11px] text-muted-foreground block truncate">{rel.primaryContactEmail}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50 italic text-[11px]">Unassigned</span>
                  )}
                </div>

                {/* Lifecycle Status Badge */}
                <div className="col-span-2 sm:col-span-2 text-right">
                  <span
                    className={`inline-flex items-center text-[10px] px-2.5 py-0.5 font-bold rounded-full border ${
                      rel.status === 'CUSTOMER'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : rel.status === 'QUALIFIED'
                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                        : rel.status === 'PROSPECT' || rel.status === 'LEAD'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {rel.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Minimal Quick Create Drawer (RM-007 Minimal Friction) */}
      {showCreateDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-card h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-border">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Quick Create Relationship</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Minimal friction creation for RM-007.</p>
                </div>
                <button
                  onClick={() => setShowCreateDrawer(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Advisory Duplicate Warning Alert */}
              {duplicateWarning && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Potential Duplicate Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mb-3">
                    Existing relationships match this name. Review matches before proceeding:
                  </p>
                  <ul className="text-xs space-y-1 mb-4">
                    {duplicateWarning.map((m) => (
                      <li key={m.id} className="font-semibold text-foreground flex justify-between">
                        <span>{m.name}</span>
                        <span className="text-muted-foreground font-mono">{m.relationshipNumber}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCreateSubmit(true)}
                      className="bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Create Anyway
                    </button>
                    <button
                      onClick={() => setDuplicateWarning(null)}
                      className="bg-secondary text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleCreateSubmit(false); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Relationship Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType('ORGANIZATION')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        newType === 'ORGANIZATION'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('INDIVIDUAL')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                        newType === 'INDIVIDUAL'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Individual
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation or Jane Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                    Primary Contact (Optional)
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Contact Name</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="john@acme.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Mobile Phone</label>
                        <input
                          type="tel"
                          placeholder="+1 555-0199"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newName.trim()}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-3 rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create & Open Workspace →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
