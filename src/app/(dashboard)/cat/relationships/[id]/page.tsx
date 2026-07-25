'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  UserCheck,
  Flame,
  Sun,
  Snowflake,
  ChevronRight,
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  DollarSign,
  UserPlus,
  Sparkles,
  Layers,
  CheckSquare
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary: boolean;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}

interface Document {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  priority: string;
  completed: boolean;
  notes?: string;
  createdAt: string;
}

interface RelationshipWorkspaceData {
  id: string;
  tenantId: string;
  relationshipNumber: string;
  name: string;
  type: string;
  status: string;
  rating?: string;
  source?: string;
  owner?: string;
  primaryContactId?: string;
  contacts: Contact[];
  notes: Note[];
  documents: Document[];
  timeline: Array<{ id: string; timestamp: string; eventType: string; description: string }>;
  createdAt: string;
  updatedAt: string;
}

const LIFECYCLE_STAGES = [
  { code: 'LEAD', label: 'Lead', description: 'Initial contact / unverified lead' },
  { code: 'PROSPECT', label: 'Prospect', description: 'Active dialogue & discovery' },
  { code: 'QUALIFIED', label: 'Qualified', description: 'Budget & requirements confirmed' },
  { code: 'CUSTOMER', label: 'Customer', description: 'Active commercial client' },
  { code: 'INACTIVE', label: 'Inactive', description: 'Dormant or paused account' },
  { code: 'ARCHIVED', label: 'Archived', description: 'Closed or historical record' },
];

function RelationshipRatingBadge({ rating = 'WARM' }: { rating?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 font-bold rounded-full border ${
        rating === 'HOT'
          ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          : rating === 'WARM'
          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      }`}
    >
      {rating === 'HOT' ? <Flame className="w-3 h-3" /> : rating === 'WARM' ? <Sun className="w-3 h-3" /> : <Snowflake className="w-3 h-3" />}
      {rating} RATING
    </span>
  );
}

export default function RelationshipWorkspaceDashboardPage() {
  const routeParams = useParams();
  const router = useRouter();
  const id = (routeParams?.id as string) || '';

  const [data, setData] = useState<RelationshipWorkspaceData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Workspace Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'activities' | 'related' | 'contacts' | 'documents'>('overview');

  // Activity Filter State
  const [timelineFilter, setTimelineFilter] = useState('ALL');

  // Input States
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);

  // New Contact State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);

  // New Activity State
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState('CALL');
  const [actDueDate, setActDueDate] = useState('');
  const [actPriority, setActPriority] = useState('MEDIUM');

  const fetchWorkspaceData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [resData, resAct] = await Promise.all([
        fetch(`/api/cat/relationships/${id}`),
        fetch(`/api/cat/relationships/${id}/activities`),
      ]);

      const json = await resData.json();
      if (json.success) {
        setData(json.relationship);
      }

      const jsonAct = await resAct.json();
      if (jsonAct.success) {
        setActivities(jsonAct.activities || []);
      }
    } catch (err) {
      console.error('Failed to load relationship workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  // Stage Transition Handler
  const handleStageTransition = async (targetStage: string) => {
    try {
      const res = await fetch(`/api/cat/relationships/${id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStage }),
      });
      const json = await res.json();
      if (json.success) {
        fetchWorkspaceData();
      } else {
        alert(`Stage transition failed: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !id) return;

    try {
      const res = await fetch(`/api/cat/relationships/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNoteContent('');
        fetchWorkspaceData();
      }
    } catch (err) {
      console.error('Add note error:', err);
    }
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !contactName.trim()) return;
    try {
      const res = await fetch(`/api/cat/relationships/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          role: contactRole,
          isPrimary: contactIsPrimary,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddContactModal(false);
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactRole('');
        setContactIsPrimary(false);
        fetchWorkspaceData();
      }
    } catch (err) {
      console.error('Add contact error:', err);
    }
  };

  const handleAddActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !actTitle.trim()) return;
    try {
      const res = await fetch(`/api/cat/relationships/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: actTitle,
          type: actType,
          dueDate: actDueDate || new Date().toISOString(),
          priority: actPriority,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddActivityModal(false);
        setActTitle('');
        setActDueDate('');
        fetchWorkspaceData();
      }
    } catch (err) {
      console.error('Add activity error:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-semibold text-muted-foreground animate-pulse">
        Loading Relationship Workspace...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-card p-12 text-center border border-border/40 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">Relationship Record Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">The requested workspace ID could not be located.</p>
        <Link href="/cat/relationships" className="text-xs font-bold text-primary hover:underline">
          &larr; Back to Relationship Directory
        </Link>
      </div>
    );
  }

  const primaryContact = data.contacts.find((c) => c.isPrimary) || data.contacts[0];
  const currentStageIndex = LIFECYCLE_STAGES.findIndex((s) => s.code === data.status);
  const rating = data.rating || 'WARM';
  const owner = data.owner || 'Sales Team';
  const source = data.source || 'Direct Inquiry';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb (Item 10: Clean production UI without dev markers) */}
      <div className="flex items-center justify-between">
        <Link
          href="/cat/relationships"
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Relationship Directory</span>
        </Link>
      </div>

      {/* 1. Hero Header (Item 2: Increased vertical breathing room and soft borders) */}
      <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-muted/60 text-muted-foreground rounded">
                {data.relationshipNumber}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-primary/10 text-primary font-bold rounded-full border border-primary/20">
                {data.type === 'ORGANIZATION' ? <Building2 className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                {data.type}
              </span>

              {/* Item 8: Abstracted Rating Component */}
              <RelationshipRatingBadge rating={rating} />
            </div>

            <h1 className="text-3xl font-extrabold text-foreground tracking-tight py-1">{data.name}</h1>

            <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground pt-0.5">
              <div>Owner: <span className="font-medium text-foreground">{owner}</span></div>
              <div>Source: <span className="font-medium text-foreground">{source}</span></div>
              <div>Created: <span className="font-medium text-foreground">{new Date(data.createdAt).toLocaleDateString()}</span></div>
              <div>Last Contact: <span className="font-medium text-foreground">{new Date(data.updatedAt).toLocaleDateString()}</span></div>
            </div>
          </div>

          {/* Hero Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              onClick={() => alert('New Inquiry flow ready for BWP-002 Inquiry Management module.')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Inquiry</span>
            </button>

            <button
              onClick={() => setShowAddActivityModal(true)}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Activity</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </button>

            <button
              onClick={() => setShowAddContactModal(true)}
              className="bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Lifecycle Banner (Item 3: Color strategy Completed=Green, Current=Blue, Future=Neutral Gray) */}
      <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Layers className="w-4 h-4 text-primary" />
            <span>Relationship Lifecycle Stage</span>
          </div>

          {currentStageIndex < LIFECYCLE_STAGES.length - 1 && (
            <button
              onClick={() => handleStageTransition(LIFECYCLE_STAGES[Math.min(currentStageIndex + 1, LIFECYCLE_STAGES.length - 1)].code)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Advance to {LIFECYCLE_STAGES[currentStageIndex + 1]?.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stepper Bar - Item 3 Color progression */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isCurrent = stage.code === data.status;
            const isPassed = idx < currentStageIndex;

            return (
              <button
                key={stage.code}
                onClick={() => handleStageTransition(stage.code)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isCurrent
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs'
                    : isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'bg-muted/20 border-border/40 text-muted-foreground/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <span>{stage.label}</span>
                  {isCurrent ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : null}
                </div>
                <div className="text-[10px] opacity-80 truncate">{stage.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Workspace Navigation Tabs (Item 4: Renamed "Activities & Tasks" -> "Activities") */}
      <div className="border-b border-border/40 flex flex-wrap gap-2 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview', icon: Sparkles },
          { id: 'timeline', label: `Timeline (${data.timeline.length + data.notes.length})`, icon: MessageSquare },
          { id: 'activities', label: `Activities (${activities.length})`, icon: CheckSquare },
          { id: 'related', label: 'Related Records', icon: Layers },
          { id: 'contacts', label: `Contacts (${data.contacts.length})`, icon: Users },
          { id: 'documents', label: `Documents & Notes (${data.documents.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 flex items-center gap-2 transition border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW (30-Second Business Dashboard) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Summary & Focus */}
          <div className="lg:col-span-2 space-y-5">
            {/* Recommended Next Action Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-2xl border border-primary/20 flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Recommended Next Action</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {data.status === 'LEAD'
                    ? 'Verify lead requirements and schedule introductory discovery call.'
                    : data.status === 'PROSPECT'
                    ? 'Schedule qualification meeting and prepare initial catering proposal.'
                    : data.status === 'QUALIFIED'
                    ? 'Create formal commercial Inquiry (BWP-002) and generate Quotation.'
                    : 'Account active. Conduct monthly check-in and review upcoming catering events.'}
                </p>
              </div>
            </div>

            {/* Today's Focus Card (Item 5.1: Compact zero-state) */}
            <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Today's Focus & Open Tasks
                </h3>
                <button
                  onClick={() => setShowAddActivityModal(true)}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  + Schedule Activity
                </button>
              </div>

              {activities.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-border/30 flex items-center justify-between">
                  <span>No activities scheduled.</span>
                  <button
                    onClick={() => setShowAddActivityModal(true)}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Schedule one &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.slice(0, 3).map((act) => (
                    <div key={act.id} className="p-3 bg-muted/20 rounded-xl border border-border/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-bold text-foreground">{act.title}</div>
                          <div className="text-[11px] text-muted-foreground">Due: {new Date(act.dueDate).toLocaleDateString()} • {act.type}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded">
                        {act.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Preview (Item 5.1: Compact zero-state) */}
            <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Recent Activity Preview
                </h3>
                <button onClick={() => setActiveTab('timeline')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                  View Full Timeline &rarr;
                </button>
              </div>

              {data.notes.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 rounded-xl border border-border/30 flex items-center justify-between">
                  <span>No activity notes recorded yet.</span>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Post note &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-3 bg-muted/20 rounded-xl border border-border/30 text-xs">
                      <div className="text-foreground leading-relaxed">{note.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-1.5">{new Date(note.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Item 5.2: Re-ordered hierarchy placing Relationship Profile FIRST) */}
          <div className="space-y-5">
            {/* 1. Account Summary Profile Card (First in Hierarchy - Item 5.2) */}
            <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-2.5 text-xs">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Relationship Profile</h3>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-semibold text-foreground capitalize">{data.type.toLowerCase()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-primary">{data.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Rating:</span>
                <span className="font-semibold text-foreground">{rating}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-muted-foreground">Lead Source:</span>
                <span className="font-semibold text-foreground">{source}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Account Owner:</span>
                <span className="font-semibold text-foreground">{owner}</span>
              </div>
            </div>

            {/* 2. Primary Contact Card */}
            <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Primary Contact
                </h3>
                <button onClick={() => setActiveTab('contacts')} className="text-xs text-primary font-semibold hover:underline cursor-pointer">
                  Manage
                </button>
              </div>

              {primaryContact ? (
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                  <div>
                    <div className="font-bold text-xs text-foreground">{primaryContact.name}</div>
                    {primaryContact.role && <div className="text-[11px] text-muted-foreground">{primaryContact.role}</div>}
                  </div>

                  <div className="text-[11px] space-y-1 text-muted-foreground pt-1">
                    {primaryContact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-primary" />
                        <a href={`mailto:${primaryContact.email}`} className="text-foreground hover:underline">{primaryContact.email}</a>
                      </div>
                    )}
                    {primaryContact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-primary" />
                        <a href={`tel:${primaryContact.phone}`} className="text-foreground hover:underline">{primaryContact.phone}</a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No primary contact designated.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE (Item 6: Improved visual spacing & activity rhythm) */}
      {activeTab === 'timeline' && (
        <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-2xs space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Unified Chronological History</h3>
            <div className="flex gap-1.5">
              {['ALL', 'NOTES', 'SYSTEM'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTimelineFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    timelineFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Note Form */}
          <form onSubmit={handleAddNote} className="flex gap-2.5">
            <input
              type="text"
              placeholder="Log note, call summary, or meeting update..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              className="flex-1 bg-muted/30 border border-border/40 rounded-xl px-4 py-2 text-xs text-foreground focus:outline-hidden"
            />
            <button type="submit" className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer">
              Post Note
            </button>
          </form>

          {/* Timeline Feed - Visual Rhythm Item 6 */}
          <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-6 pt-2">
            {data.notes.map((n) => (
              <div key={n.id} className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="bg-muted/20 border border-border/30 rounded-xl p-3.5 space-y-1 text-xs">
                  <div className="text-foreground leading-relaxed">{n.content}</div>
                  <div className="text-[10px] text-muted-foreground pt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-2xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground">Future Activities & Tasks</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage calls, meetings, follow-ups, and reminders.</p>
            </div>
            <button
              onClick={() => setShowAddActivityModal(true)}
              className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              + Schedule Activity
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No activities scheduled yet.</div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((act) => (
                <div key={act.id} className="p-3.5 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-foreground">{act.title}</div>
                    <div className="text-[11px] text-muted-foreground">Type: {act.type} • Due: {new Date(act.dueDate).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-full">
                    {act.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RELATED RECORDS (Item 7: Informative Empty States without implying non-existent features) */}
      {activeTab === 'related' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Business Development Card */}
          <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5 text-primary" /> Business Development
              </h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">BWP-002 / BWP-003</span>
            </div>
            <p className="text-xs text-muted-foreground">Inquiries & Commercial Quotations</p>
            <div className="p-3.5 bg-muted/15 border border-border/30 rounded-xl text-xs text-muted-foreground">
              Available once Inquiry & Quotation module (BWP-002) is active.
            </div>
          </div>

          {/* Operations Card */}
          <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Operations
              </h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">BWP-005</span>
            </div>
            <p className="text-xs text-muted-foreground">Catering Events & Bookings</p>
            <div className="p-3.5 bg-muted/15 border border-border/30 rounded-xl text-xs text-muted-foreground">
              Available once Catering Events module (BWP-005) is active.
            </div>
          </div>

          {/* Finance Card */}
          <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Financial Summary
              </h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">Finance</span>
            </div>
            <p className="text-xs text-muted-foreground">Invoices, Receipts & Ledger</p>
            <div className="p-3.5 bg-muted/15 border border-border/30 rounded-xl text-xs text-muted-foreground">
              Available once Finance module is active.
            </div>
          </div>

          {/* Documents Card */}
          <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-amber-500" /> Communication & Documents
              </h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold">Files</span>
            </div>
            <p className="text-xs text-muted-foreground">Attached Contracts & Uploads</p>
            <div className="p-3.5 bg-muted/15 border border-border/30 rounded-xl text-xs text-muted-foreground">
              {data.documents.length} document(s) uploaded.
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-2xs space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Contact Roster ({data.contacts.length})</h3>
            <button onClick={() => setShowAddContactModal(true)} className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer">
              + Add Contact
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.contacts.map((c) => (
              <div key={c.id} className={`p-4 rounded-xl border ${c.isPrimary ? 'border-primary/30 bg-primary/5' : 'border-border/40 bg-muted/15'}`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-xs text-foreground">{c.name}</div>
                  {c.isPrimary && <span className="text-[9px] bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">PRIMARY</span>}
                </div>
                {c.role && <div className="text-[11px] text-muted-foreground mb-2">{c.role}</div>}
                <div className="text-xs text-muted-foreground space-y-1">
                  {c.email && <div>📧 {c.email}</div>}
                  {c.phone && <div>📞 {c.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-card p-6 rounded-2xl border border-border/40 shadow-2xs space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Document Repository ({data.documents.length})</h3>
            <button onClick={() => alert('Document uploader ready.')} className="bg-primary text-primary-foreground font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer">
              + Upload Document
            </button>
          </div>

          {data.documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-2">
              {data.documents.map((doc) => (
                <div key={doc.id} className="p-3.5 bg-muted/15 border border-border/30 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-foreground">{doc.fileName}</div>
                    <div className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB • {doc.fileType}</div>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline">Download</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Add New Contact</h3>
            <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs">
              <input type="text" required placeholder="Full Name *" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden" />
              <input type="email" placeholder="Email Address" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden" />
              <input type="tel" placeholder="Phone Number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden" />
              <input type="text" placeholder="Role / Position (e.g. Event Coordinator)" value={contactRole} onChange={(e) => setContactRole(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={contactIsPrimary} onChange={(e) => setContactIsPrimary(e.target.checked)} />
                <span>Set as Primary Contact</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddContactModal(false)} className="px-3 py-2 bg-muted text-xs font-semibold rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Save Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Schedule Activity / Task</h3>
            <form onSubmit={handleAddActivitySubmit} className="space-y-3 text-xs">
              <input type="text" required placeholder="Activity Subject / Title *" value={actTitle} onChange={(e) => setActTitle(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-hidden" />
              <div className="grid grid-cols-2 gap-2">
                <select value={actType} onChange={(e) => setActType(e.target.value)} className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground">
                  <option value="CALL">Call</option>
                  <option value="MEETING">Meeting</option>
                  <option value="TASK">Task</option>
                  <option value="FOLLOWUP">Follow-up</option>
                </select>
                <select value={actPriority} onChange={(e) => setActPriority(e.target.value)} className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground">
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              <input type="date" value={actDueDate} onChange={(e) => setActDueDate(e.target.value)} className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddActivityModal(false)} className="px-3 py-2 bg-muted text-xs font-semibold rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
