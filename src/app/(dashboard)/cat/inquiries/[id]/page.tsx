"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  X,
  AlertTriangle,
  Send,
  Building2,
  UtensilsCrossed,
  Sparkle,
  Music,
  HelpCircle,
  ArrowRight,
  Target,
  Plus,
  CheckSquare,
  History,
  Phone,
  Users,
  Eye,
  ChefHat,
  Briefcase,
  MessageSquareText,
  UserCheck,
  Tag,
  Filter,
} from "lucide-react";
import {
  DiscoveryArea,
  DiscoveryAreaKey,
  InquiryDiscoveryOverview,
  DiscoveryLifecycleStatus,
  BusinessValidationStatus,
} from "@/modules/cat/inquiry/domain/discovery-types";
import {
  ActivityPriority,
  ActivityType,
  GroupedActivities,
  InquiryActivity,
  TimelineCategory,
  TimelineItem,
} from "@/modules/cat/inquiry/domain/activity-types";
import EventBasicsWorkspacePanel from "./components/event-basics-workspace-panel";

interface InquiryWorkspaceData {
  id: string;
  inquiryNumber: string;
  title: string;
  relationshipId: string;
  relationshipName?: string;
  relationshipNumber?: string;
  eventType: string;
  tentativeEventDate?: string;
  expectedGuestCount?: number;
  budgetRange?: string;
  priority: string;
  inquiryStage: string;
  assignedSalesperson?: string;
  inquirySource?: string;
  venue?: string;
  serviceStyle?: string;
  foodPreference?: string;
  createdAt: string;
  updatedAt: string;
}

const AREA_ICONS: Record<DiscoveryAreaKey, React.ReactNode> = {
  EVENT_BASICS: <Calendar className="w-4 h-4 text-blue-600" />,
  VENUE: <Building2 className="w-4 h-4 text-emerald-600" />,
  FOOD_BEVERAGE: <UtensilsCrossed className="w-4 h-4 text-amber-600" />,
  BUDGET_COMMERCIALS: <DollarSign className="w-4 h-4 text-purple-600" />,
  SERVICE_EXPERIENCE: <Sparkles className="w-4 h-4 text-pink-600" />,
  DECOR_AMBIENCE: <Sparkle className="w-4 h-4 text-indigo-600" />,
  ENTERTAINMENT_ADDONS: <Music className="w-4 h-4 text-cyan-600" />,
  SPECIAL_REQUIREMENTS: <HelpCircle className="w-4 h-4 text-orange-600" />,
};

const ACTIVITY_TYPE_LABELS: Record<
  ActivityType,
  { label: string; icon: React.ReactNode }
> = {
  FOLLOW_UP: {
    label: "Follow-up",
    icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
  },
  CLIENT_CALL: {
    label: "Client Call",
    icon: <Phone className="w-3.5 h-3.5 text-emerald-600" />,
  },
  CLIENT_MEETING: {
    label: "Client Meeting",
    icon: <Users className="w-3.5 h-3.5 text-indigo-600" />,
  },
  SITE_VISIT: {
    label: "Site Visit",
    icon: <Eye className="w-3.5 h-3.5 text-purple-600" />,
  },
  MENU_TASTING: {
    label: "Menu Tasting",
    icon: <ChefHat className="w-3.5 h-3.5 text-amber-600" />,
  },
  COMMERCIAL_REVIEW: {
    label: "Commercial Review",
    icon: <Briefcase className="w-3.5 h-3.5 text-rose-600" />,
  },
  INTERNAL_NOTE: {
    label: "Internal Note",
    icon: <MessageSquareText className="w-3.5 h-3.5 text-slate-600" />,
  },
};

export default function InquiryWorkspacePage() {
  const routeParams = useParams();
  const id = (routeParams?.id as string) || "";

  const [inquiry, setInquiry] = useState<InquiryWorkspaceData | null>(null);
  const [overview, setOverview] = useState<InquiryDiscoveryOverview | null>(
    null,
  );
  const [activitiesGrouped, setActivitiesGrouped] =
    useState<GroupedActivities | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Discovery Modal
  const [activeArea, setActiveArea] = useState<DiscoveryArea | null>(null);
  const [editLifecycle, setEditLifecycle] =
    useState<DiscoveryLifecycleStatus>("NOT_STARTED");
  const [editValidation, setEditValidation] =
    useState<BusinessValidationStatus>("READY");
  const [editSummary, setEditSummary] = useState("");
  const [savingDiscovery, setSavingDiscovery] = useState(false);

  // WP02B State: Create Activity Modal
  const [showCreateActivityModal, setShowCreateActivityModal] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityType, setNewActivityType] =
    useState<ActivityType>("FOLLOW_UP");
  const [newActivityDueDate, setNewActivityDueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newActivityPriority, setNewActivityPriority] =
    useState<ActivityPriority>("MEDIUM");
  const [newActivityOwner, setNewActivityOwner] = useState("Sales Team");
  const [newActivityAreaKey, setNewActivityAreaKey] = useState<
    DiscoveryAreaKey | ""
  >("");
  const [savingActivity, setSavingActivity] = useState(false);

  // WP02B State: Complete Activity Modal
  const [completingActivity, setCompletingActivity] =
    useState<InquiryActivity | null>(null);
  const [activityOutcome, setActivityOutcome] = useState("");
  const [completing, setCompleting] = useState(false);

  // WP02B State: Post Informational Note
  const [noteContent, setNoteContent] = useState("");
  const [postingNote, setPostingNote] = useState(false);

  // Active Workspace Navigation Tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    | "OVERVIEW"
    | "ACTIVITIES"
    | "TIMELINE"
    | "REQUIREMENTS"
    | "QUOTATIONS"
    | "DOCUMENTS"
    | "NOTES"
  >("OVERVIEW");

  // PR-IM-010 State: Requirements Discovery Directory & Workspace View Navigation
  const [activeDiscoveryView, setActiveDiscoveryView] = useState<
    "DIRECTORY" | "EVENT_BASICS"
  >("DIRECTORY");

  // WP02B State: Filters
  const [activityTab, setActivityTab] = useState<
    "ALL" | "OVERDUE" | "TODAY" | "TOMORROW" | "UPCOMING" | "COMPLETED"
  >("ALL");
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<
    TimelineCategory | "ALL"
  >("ALL");

  const fetchWorkspaceData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inquiryRes, discoveryRes, activitiesRes, timelineRes] =
        await Promise.all([
          fetch(`/api/cat/inquiries/${id}`),
          fetch(`/api/cat/inquiries/${id}/discovery`),
          fetch(`/api/cat/inquiries/${id}/activities`),
          fetch(`/api/cat/inquiries/${id}/timeline`),
        ]);

      const inquiryJson = inquiryRes.ok
        ? await inquiryRes.json().catch(() => ({}))
        : {};
      const discoveryJson = discoveryRes.ok
        ? await discoveryRes.json().catch(() => ({}))
        : {};
      const activitiesJson = activitiesRes.ok
        ? await activitiesRes.json().catch(() => ({}))
        : {};
      const timelineJson = timelineRes.ok
        ? await timelineRes.json().catch(() => ({}))
        : {};

      if (inquiryJson.success) setInquiry(inquiryJson.inquiry);
      if (discoveryJson.success) setOverview(discoveryJson.overview);
      if (activitiesJson.success) setActivitiesGrouped(activitiesJson.grouped);
      if (timelineJson.success) setTimeline(timelineJson.timeline);
    } catch (err) {
      console.error("Failed to load inquiry workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  // Discovery handlers
  const openDiscoveryModal = (area: DiscoveryArea) => {
    if (area.areaKey === "EVENT_BASICS") {
      setActiveWorkspaceTab("REQUIREMENTS");
      setActiveDiscoveryView("EVENT_BASICS");
      return;
    }
    setActiveArea(area);
    setEditLifecycle(area.lifecycle);
    setEditValidation(area.validation);
    setEditSummary(area.summary || "");
  };

  const handleSaveDiscovery = async () => {
    if (!activeArea) return;
    setSavingDiscovery(true);
    try {
      const res = await fetch(`/api/cat/inquiries/${id}/discovery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaKey: activeArea.areaKey,
          lifecycle: editLifecycle,
          validation: editValidation,
          summary: editSummary,
        }),
      });

      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (json.success) {
        setOverview(json.overview);
        setActiveArea(null);
        // Refresh timeline after discovery update
        const tlRes = await fetch(`/api/cat/inquiries/${id}/timeline`);
        const tlJson = tlRes.ok ? await tlRes.json().catch(() => ({})) : {};
        if (tlJson.success) setTimeline(tlJson.timeline);
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingDiscovery(false);
    }
  };

  // Activity Create Handler
  const handleCreateActivity = async () => {
    if (!newActivityTitle.trim()) return;
    setSavingActivity(true);
    try {
      const res = await fetch(`/api/cat/inquiries/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newActivityTitle,
          type: newActivityType,
          dueDate: newActivityDueDate,
          priority: newActivityPriority,
          assignedTo: newActivityOwner,
          discoveryAreaKey: newActivityAreaKey || undefined,
        }),
      });
      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (json.success) {
        setActivitiesGrouped(json.grouped);
        setShowCreateActivityModal(false);
        setNewActivityTitle("");
        setNewActivityAreaKey("");
        // Refresh timeline
        const tlRes = await fetch(`/api/cat/inquiries/${id}/timeline`);
        const tlJson = tlRes.ok ? await tlRes.json().catch(() => ({})) : {};
        if (tlJson.success) setTimeline(tlJson.timeline);
      }
    } catch (err: any) {
      alert(`Error creating activity: ${err.message}`);
    } finally {
      setSavingActivity(false);
    }
  };

  // Activity Complete Handler
  const handleCompleteActivity = async () => {
    if (!completingActivity) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/cat/inquiries/${id}/activities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: completingActivity.id,
          status: "COMPLETED",
          outcome: activityOutcome,
          completedBy: "Sales Manager",
        }),
      });
      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (json.success) {
        setActivitiesGrouped(json.grouped);
        setCompletingActivity(null);
        setActivityOutcome("");
        // Refresh timeline
        const tlRes = await fetch(`/api/cat/inquiries/${id}/timeline`);
        const tlJson = tlRes.ok ? await tlRes.json().catch(() => ({})) : {};
        if (tlJson.success) setTimeline(tlJson.timeline);
      }
    } catch (err: any) {
      alert(`Error completing activity: ${err.message}`);
    } finally {
      setCompleting(false);
    }
  };

  // Post Informational Note Handler (Timeline category: NOTE)
  const handlePostNote = async () => {
    if (!noteContent.trim()) return;
    setPostingNote(true);
    try {
      const res = await fetch(`/api/cat/inquiries/${id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          actor: salesperson,
        }),
      });
      const json = res.ok ? await res.json().catch(() => ({})) : {};
      if (json.success) {
        setTimeline(json.timeline);
        setNoteContent("");
      }
    } catch (err: any) {
      alert(`Error posting note: ${err.message}`);
    } finally {
      setPostingNote(false);
    }
  };

  const handleEventBasicsSaveSuccess = async (
    nextOverview?: InquiryDiscoveryOverview,
  ) => {
    if (nextOverview) {
      setOverview(nextOverview);
    }
    await fetchWorkspaceData();
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-semibold text-muted-foreground animate-pulse">
        Loading Inquiry Workspace, Activities & Timeline...
      </div>
    );
  }

  if (!inquiry || !overview) {
    return (
      <div className="bg-card p-12 text-center border border-border/40 rounded-2xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">
          Inquiry Record Not Found
        </h2>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          The requested Inquiry ID could not be located.
        </p>
        <Link
          href="/cat/inquiries"
          className="text-xs font-bold text-primary hover:underline"
        >
          &larr; Back to Inquiry Directory
        </Link>
      </div>
    );
  }

  const salesperson = inquiry.assignedSalesperson || "Sales Team";
  const mandatoryAreas = overview.areas.filter((a) => a.isMandatory);
  const additionalAreas = overview.areas.filter((a) => !a.isMandatory);

  // Filter Timeline Items
  const filteredTimeline =
    timelineCategoryFilter === "ALL"
      ? timeline
      : timeline.filter((t) => t.category === timelineCategoryFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/cat/inquiries"
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inquiry Directory</span>
        </Link>
      </div>

      {/* 1. FROZEN IM-WP02A: Hero Header */}
      <div className="bg-card p-5 rounded-2xl border border-border/40 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-muted/60 text-muted-foreground rounded">
                {inquiry.inquiryNumber}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-primary/10 text-primary font-bold rounded-full border border-primary/20">
                <FileText className="w-3 h-3" />
                {inquiry.eventType}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-amber-500/10 text-amber-600 font-bold rounded-full border border-amber-500/20">
                PRIORITY: {inquiry.priority}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-foreground tracking-tight py-0.5">
              {inquiry.title}
            </h1>

            <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
                Relationship:{" "}
                <Link
                  href={`/cat/relationships/${inquiry.relationshipId}`}
                  className="font-extrabold underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                >
                  {inquiry.relationshipName || "Account"}
                </Link>
              </div>
              <div>
                Salesperson:{" "}
                <span className="font-medium text-foreground">
                  {salesperson}
                </span>
              </div>
              {inquiry.tentativeEventDate && (
                <div>
                  Event Date:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(inquiry.tentativeEventDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. RESTORED INQUIRY WORKSPACE NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-border/40 overflow-x-auto text-xs font-bold pt-1">
        {[
          {
            id: "OVERVIEW",
            label: "Overview",
            icon: <Target className="w-4 h-4" />,
          },
          {
            id: "ACTIVITIES",
            label: `Activities ${activitiesGrouped ? `(${activitiesGrouped.overdue.length + activitiesGrouped.today.length + activitiesGrouped.tomorrow.length + activitiesGrouped.upcoming.length})` : ""}`,
            icon: <CheckSquare className="w-4 h-4" />,
          },

          {
            id: "TIMELINE",
            label: `Timeline ${timeline ? `(${timeline.length})` : ""}`,
            icon: <History className="w-4 h-4" />,
          },
          {
            id: "REQUIREMENTS",
            label: "Requirements",
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "QUOTATIONS",
            label: "Quotations",
            icon: <DollarSign className="w-4 h-4" />,
          },
          {
            id: "DOCUMENTS",
            label: "Documents",
            icon: <Briefcase className="w-4 h-4" />,
          },
          {
            id: "NOTES",
            label: "Notes",
            icon: <MessageSquareText className="w-4 h-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveWorkspaceTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition shrink-0 cursor-pointer ${
              activeWorkspaceTab === tab.id
                ? "border-primary text-primary bg-primary/5 rounded-t-xl"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-t-xl"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW TAB CONTENT                                               */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Today's Focus Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-indigo-500/40 pb-2">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-indigo-200">
                <Target className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
                <span>TODAY'S FOCUS — WHAT SHOULD I DO NEXT TODAY?</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/30 text-indigo-100 rounded-full border border-indigo-400/25">
                Priority Directive
              </span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="space-y-0.5">
                <h2 className="text-lg font-black text-white tracking-tight leading-tight">
                  {overview.todayFocus.actionText}
                </h2>
                <p className="text-xs text-indigo-100/90 leading-normal max-w-3xl">
                  {overview.todayFocus.reasonText}
                </p>
              </div>

              <button
                onClick={() => {
                  const target = overview.areas.find(
                    (a) => a.areaKey === overview.todayFocus.areaKey,
                  );
                  if (target) openDiscoveryModal(target);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 bg-white text-indigo-900 rounded-xl hover:bg-indigo-50 transition shadow-xs shrink-0"
              >
                <span>
                  Continue Discovery for {overview.todayFocus.areaTitle}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Overview Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Quotation Readiness */}
            <div className="bg-card p-4 rounded-2xl border border-border/40 space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                  Quotation Readiness
                </span>
                {overview.quotationReadiness === "READY_FOR_QUOTATION" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready for Quotation
                  </span>
                )}
                {overview.quotationReadiness === "NEEDS_ATTENTION" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 bg-amber-500/15 text-amber-600 rounded-full border border-amber-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Attention
                  </span>
                )}
                {overview.quotationReadiness === "NOT_READY" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 bg-slate-500/15 text-slate-600 rounded-full border border-slate-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Not Ready for Quotation
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-foreground mb-1.5">
                  Mandatory Requirements Preventing Quotation:
                </h4>
                {!overview.preventingMandatoryRequirements ||
                overview.preventingMandatoryRequirements.length === 0 ? (
                  <div className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      All 4 mandatory discovery areas are Completed and Ready.
                    </span>
                  </div>
                ) : (
                  <div className="bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/20 space-y-1.5">
                    <p className="text-[11px] text-rose-700 font-medium leading-tight">
                      Quotation generation is prevented until the following
                      mandatory requirements are satisfied:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-0.5">
                      {overview.preventingMandatoryRequirements.map(
                        (item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-rose-700 font-bold flex items-center justify-between bg-card p-2 rounded-lg border border-rose-200/80 shadow-2xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{item.areaTitle}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-rose-500/10 text-rose-600 rounded-md">
                              {item.reason}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Recommended Next Action & Discovery Progress */}
            <div className="bg-card p-4 rounded-2xl border border-border/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                  <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                    Discovery Progress
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {overview.discoveryProgress.completedAreas} of{" "}
                    {overview.discoveryProgress.totalAreas} Complete
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/30 p-2.5 rounded-xl border border-border/30">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-0.5">
                      Mandatory
                    </span>
                    <span className="font-extrabold text-foreground text-xs">
                      {overview.discoveryProgress.mandatoryCompleted} of{" "}
                      {overview.discoveryProgress.mandatoryTotal} Complete
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded-xl border border-border/30">
                    <span className="text-[11px] font-bold text-muted-foreground block mb-0.5">
                      Additional
                    </span>
                    <span className="font-extrabold text-foreground text-xs">
                      {overview.discoveryProgress.optionalCompleted} of{" "}
                      {overview.discoveryProgress.optionalTotal} Complete
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/25 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                  RECOMMENDED NEXT ACTION
                </span>
                <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-indigo-950 font-extrabold">
                    {overview.recommendedNextAction}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Visually Separated Discovery Grids */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Mandatory Discovery</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20">
                    4 Required Areas
                  </span>
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mandatoryAreas.map((area) => (
                <DiscoveryAreaCard
                  key={area.id}
                  area={area}
                  onContinueDiscovery={openDiscoveryModal}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60" />
                  <span>Additional Discovery</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border/40">
                    4 Optional Areas
                  </span>
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {additionalAreas.map((area) => (
                <DiscoveryAreaCard
                  key={area.id}
                  area={area}
                  onContinueDiscovery={openDiscoveryModal}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACTIVITIES TAB CONTENT                                             */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === "ACTIVITIES" && (
        <div className="space-y-4">
          {/* PR-IM-006 Refinement 2: Perfect vertical alignment of Create Activity action with heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  Activities
                </h2>
                <span className="text-xs text-muted-foreground font-normal">
                  ("What do we need to do?")
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Actionable operational tasks required to advance this inquiry.
              </p>
            </div>

            <button
              onClick={() => setShowCreateActivityModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Create Activity</span>
            </button>
          </div>

          {/* Activity Urgency Group Tabs */}
          {activitiesGrouped && (
            <div className="space-y-4">
              {/* PR-IM-006 Refinement 1: Compact badge styling for filter counters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {(
                  [
                    {
                      id: "ALL",
                      label: "All Activities",
                      count:
                        activitiesGrouped.overdue.length +
                        activitiesGrouped.today.length +
                        activitiesGrouped.tomorrow.length +
                        activitiesGrouped.upcoming.length +
                        activitiesGrouped.completed.length,
                    },
                    {
                      id: "OVERDUE",
                      label: "Overdue",
                      count: activitiesGrouped.overdue.length,
                    },
                    {
                      id: "TODAY",
                      label: "Today",
                      count: activitiesGrouped.today.length,
                    },
                    {
                      id: "TOMORROW",
                      label: "Tomorrow",
                      count: activitiesGrouped.tomorrow.length,
                    },
                    {
                      id: "UPCOMING",
                      label: "Upcoming",
                      count: activitiesGrouped.upcoming.length,
                    },
                    {
                      id: "COMPLETED",
                      label: "Completed",
                      count: activitiesGrouped.completed.length,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivityTab(tab.id as any)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                      activityTab === tab.id
                        ? "bg-foreground text-background"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                        activityTab === tab.id
                          ? "bg-background text-foreground"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Render Urgency Group Sections */}
              <div className="space-y-4">
                {(activityTab === "ALL" || activityTab === "OVERDUE") &&
                  activitiesGrouped.overdue.length > 0 && (
                    <ActivityGroupSection
                      title="Overdue Tasks"
                      accentColor="rose"
                      activities={activitiesGrouped.overdue}
                      onComplete={(act) => {
                        setCompletingActivity(act);
                        setActivityOutcome("");
                      }}
                    />
                  )}

                {(activityTab === "ALL" || activityTab === "TODAY") &&
                  activitiesGrouped.today.length > 0 && (
                    <ActivityGroupSection
                      title="Due Today"
                      accentColor="amber"
                      activities={activitiesGrouped.today}
                      onComplete={(act) => {
                        setCompletingActivity(act);
                        setActivityOutcome("");
                      }}
                    />
                  )}

                {(activityTab === "ALL" || activityTab === "TOMORROW") &&
                  activitiesGrouped.tomorrow.length > 0 && (
                    <ActivityGroupSection
                      title="Due Tomorrow"
                      accentColor="blue"
                      activities={activitiesGrouped.tomorrow}
                      onComplete={(act) => {
                        setCompletingActivity(act);
                        setActivityOutcome("");
                      }}
                    />
                  )}

                {(activityTab === "ALL" || activityTab === "UPCOMING") &&
                  activitiesGrouped.upcoming.length > 0 && (
                    <ActivityGroupSection
                      title="Upcoming Tasks"
                      accentColor="indigo"
                      activities={activitiesGrouped.upcoming}
                      onComplete={(act) => {
                        setCompletingActivity(act);
                        setActivityOutcome("");
                      }}
                    />
                  )}

                {(activityTab === "ALL" || activityTab === "COMPLETED") &&
                  activitiesGrouped.completed.length > 0 && (
                    <ActivityGroupSection
                      title="Completed Tasks"
                      accentColor="emerald"
                      activities={activitiesGrouped.completed}
                      onComplete={(act) => {
                        setCompletingActivity(act);
                        setActivityOutcome(act.outcome || "");
                      }}
                    />
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TIMELINE TAB CONTENT                                               */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === "TIMELINE" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600 shrink-0" />
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  System Timeline
                </h2>
                <span className="text-xs text-muted-foreground font-normal">
                  (Read-only system-generated feed)
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Automated audit stream of inquiry milestones, discovery updates,
                activity events, and notes.
              </p>
            </div>

            {/* Timeline Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] self-start sm:self-center">
              {(
                [
                  { id: "ALL", label: "All Events" },
                  { id: "MILESTONE", label: "Milestones" },
                  { id: "DISCOVERY_EVENT", label: "Discovery" },
                  { id: "ACTIVITY_EVENT", label: "Activities" },
                  { id: "NOTE", label: "Notes" },
                  { id: "SYSTEM_AUDIT", label: "Audit" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setTimelineCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                    timelineCategoryFilter === cat.id
                      ? "bg-indigo-600 text-white"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post Informational Note Input Box */}
          <div className="bg-card p-4 rounded-2xl border border-border/40 space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-primary" />
              <span>Post Informational Note</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Post a note to the timeline (e.g., Client requested VIP seating update)..."
                className="flex-1 text-xs bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePostNote();
                }}
              />
              <button
                onClick={handlePostNote}
                disabled={postingNote || !noteContent.trim()}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-2xs shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {postingNote ? "Posting..." : "Post Note"}
              </button>
            </div>
          </div>

          {/* Timeline Stream Feed */}
          <div className="bg-card p-5 rounded-2xl border border-border/40 space-y-4">
            {filteredTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No timeline entries logged for this category.
              </p>
            ) : (
              <div className="relative pl-6 border-l-2 border-border/40 space-y-6">
                {filteredTimeline.map((item) => (
                  <div key={item.id} className="relative group">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-card bg-indigo-600 group-hover:scale-125 transition" />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {item.category}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">
                          {item.title}
                        </h4>
                        {/* PR-IM-006 Refinement 4: Reduced timestamp emphasis */}
                        <span className="text-[10px] text-muted-foreground/50 ml-auto font-medium">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      {/* PR-IM-006 Refinement 4: Primary reading order emphasis for description */}
                      <p className="text-xs text-foreground/90 font-medium leading-relaxed">
                        {item.description}
                      </p>

                      <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-medium pt-0.5">
                        <UserCheck className="w-3 h-3 text-muted-foreground" />
                        <span>Actor: {item.actor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OTHER PLACEHOLDER TABS                                                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 4: REQUIREMENTS (DISCOVERY DIRECTORY & WORKSPACES)                   */}
      {/* ========================================================================= */}
      {activeWorkspaceTab === "REQUIREMENTS" && (
        <div className="space-y-6">
          {activeDiscoveryView === "EVENT_BASICS" ? (
            <EventBasicsWorkspacePanel
              inquiryId={id}
              initialArea={
                overview.areas.find((a) => a.areaKey === "EVENT_BASICS") || null
              }
              initialInquiryDate={inquiry.tentativeEventDate}
              initialInquiryTitle={inquiry.title}
              onBackToRequirements={() => setActiveDiscoveryView("DIRECTORY")}
              onSaveSuccess={handleEventBasicsSaveSuccess}
            />
          ) : (
            <div className="space-y-6">
              {/* Discovery Directory Header Banner */}
              <div className="bg-card p-4 rounded-2xl border border-border/40 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                    Discovery Directory
                  </h2>
                  <span className="text-xs text-muted-foreground font-normal">
                    (Inquiry Requirements & Guided Business Conversations)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  Click any Discovery Area below to open its dedicated Business
                  Discovery Workspace.
                </p>
              </div>

              {/* Mandatory Discovery Section (4 Areas) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Mandatory Discovery</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20">
                      4 Required Areas
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {mandatoryAreas.map((area) => (
                    <DiscoveryAreaCard
                      key={area.id}
                      area={area}
                      onContinueDiscovery={(selectedArea) => {
                        if (selectedArea.areaKey === "EVENT_BASICS") {
                          setActiveDiscoveryView("EVENT_BASICS");
                        } else {
                          openDiscoveryModal(selectedArea);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Additional Discovery Section (4 Areas) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60" />
                    <span>Additional Discovery</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border/40">
                      4 Optional Areas
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {additionalAreas.map((area) => (
                    <DiscoveryAreaCard
                      key={area.id}
                      area={area}
                      onContinueDiscovery={(selectedArea) => {
                        if (selectedArea.areaKey === "EVENT_BASICS") {
                          setActiveDiscoveryView("EVENT_BASICS");
                        } else {
                          openDiscoveryModal(selectedArea);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeWorkspaceTab === "QUOTATIONS" && (
        <div className="bg-card p-12 rounded-2xl border border-border/40 text-center space-y-3">
          <DollarSign className="w-10 h-10 text-indigo-600 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-foreground">
            Quotation & Proposal Engine
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Commercial quotation creation, pricing calculation, and proposal
            generation.
          </p>
        </div>
      )}

      {activeWorkspaceTab === "DOCUMENTS" && (
        <div className="bg-card p-12 rounded-2xl border border-border/40 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-emerald-600 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-foreground">
            Inquiry Document Management
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Contracts, menu PDFs, site plans, and client attachment repository.
          </p>
        </div>
      )}

      {activeWorkspaceTab === "NOTES" && (
        <div className="bg-card p-12 rounded-2xl border border-border/40 text-center space-y-3">
          <MessageSquareText className="w-10 h-10 text-amber-600 mx-auto opacity-60" />
          <h3 className="text-base font-bold text-foreground">
            Workspace Informational Log & Notes
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto font-medium mb-4">
            Informational notes log for internal team communication.
          </p>
          {/* Re-use Post Note component for Notes Tab */}
          <div className="max-w-xl mx-auto bg-muted/20 p-4 rounded-2xl border border-border/40 space-y-2 text-left">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-primary" />
              <span>Post Quick Note</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write an internal note..."
                className="flex-1 text-xs bg-background border border-border/60 rounded-xl px-3 py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePostNote();
                }}
              />
              <button
                onClick={handlePostNote}
                disabled={postingNote || !noteContent.trim()}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer"
              >
                {postingNote ? "Posting..." : "Post Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FROZEN IM-WP02A DISCOVERY MODAL                                 */}
      {/* ========================================================================= */}
      {activeArea && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-card border border-border/40">
                  {AREA_ICONS[activeArea.areaKey]}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Continue Discovery: {activeArea.title}
                  </h3>
                  <p className="text-xs text-muted-foreground italic">
                    "{activeArea.question}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveArea(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Discovery Lifecycle Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { code: "NOT_STARTED", label: "Not Started" },
                      { code: "IN_PROGRESS", label: "In Progress" },
                      { code: "COMPLETED", label: "Completed" },
                      { code: "REOPENED", label: "Reopened" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setEditLifecycle(option.code)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-left ${
                        editLifecycle === option.code
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:border-border"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Business Validation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { code: "READY", label: "Ready" },
                      { code: "NEEDS_ATTENTION", label: "Needs Attention" },
                      { code: "BLOCKED", label: "Blocked" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setEditValidation(option.code)}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-center ${
                        editValidation === option.code
                          ? option.code === "READY"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : option.code === "NEEDS_ATTENTION"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-rose-600 text-white border-rose-600"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:border-border"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Latest Discovery (Max 2 Lines)</span>
                </label>
                <textarea
                  rows={2}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Capture key discovery decision..."
                  className="w-full text-xs bg-background border border-border/60 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveArea(null)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingDiscovery}
                onClick={handleSaveDiscovery}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-xs flex items-center gap-1.5"
              >
                {savingDiscovery ? "Saving..." : "Continue Discovery & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IM-WP02B CREATE ACTIVITY MODAL                                   */}
      {/* ========================================================================= */}
      {showCreateActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">
                  Create Activity
                </h3>
              </div>
              <button
                onClick={() => setShowCreateActivityModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Activity Title *
                </label>
                <input
                  type="text"
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  placeholder="e.g. Schedule Site Visit for Grand Ballroom"
                  className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5 focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Activity Type
                  </label>
                  <select
                    value={newActivityType}
                    onChange={(e) =>
                      setNewActivityType(e.target.value as ActivityType)
                    }
                    className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                  >
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="CLIENT_CALL">Client Call</option>
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="SITE_VISIT">Site Visit</option>
                    <option value="MENU_TASTING">Menu Tasting</option>
                    <option value="COMMERCIAL_REVIEW">Commercial Review</option>
                    <option value="INTERNAL_NOTE">Internal Note</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Priority
                  </label>
                  <select
                    value={newActivityPriority}
                    onChange={(e) =>
                      setNewActivityPriority(e.target.value as ActivityPriority)
                    }
                    className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newActivityDueDate}
                    onChange={(e) => setNewActivityDueDate(e.target.value)}
                    className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">
                    Assigned Owner
                  </label>
                  <input
                    type="text"
                    value={newActivityOwner}
                    onChange={(e) => setNewActivityOwner(e.target.value)}
                    className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Optional Discovery Area Association
                </label>
                <select
                  value={newActivityAreaKey}
                  onChange={(e) =>
                    setNewActivityAreaKey(
                      e.target.value as DiscoveryAreaKey | "",
                    )
                  }
                  className="w-full text-xs bg-background border border-border/60 rounded-xl p-2.5"
                >
                  <option value="">-- Unlinked (General Activity) --</option>
                  {overview.areas.map((area) => (
                    <option key={area.areaKey} value={area.areaKey}>
                      {area.title} (
                      {area.isMandatory ? "Mandatory" : "Optional"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateActivityModal(false)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingActivity || !newActivityTitle.trim()}
                onClick={handleCreateActivity}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-xs"
              >
                {savingActivity ? "Creating..." : "Save Activity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: IM-WP02B COMPLETE ACTIVITY WITH OUTCOME MODAL                   */}
      {/* ========================================================================= */}
      {completingActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-foreground">
                  Complete Activity: {completingActivity.title}
                </h3>
              </div>
              <button
                onClick={() => setCompletingActivity(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Business Outcome *
                </label>
                <textarea
                  rows={3}
                  value={activityOutcome}
                  onChange={(e) => setActivityOutcome(e.target.value)}
                  placeholder="Record the business result of this completed activity..."
                  className="w-full text-xs font-medium bg-background border border-border/60 rounded-xl p-3 focus:ring-2 focus:ring-primary/40 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletingActivity(null)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={completing}
                onClick={handleCompleteActivity}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-xs"
              >
                {completing ? "Completing..." : "Complete Activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

{
  /* Polished Discovery Area Card Component (FROZEN IM-WP02A) */
}
function DiscoveryAreaCard({
  area,
  onContinueDiscovery,
}: {
  area: DiscoveryArea;
  onContinueDiscovery: (area: DiscoveryArea) => void;
}) {
  return (
    <div className="bg-card p-4 rounded-2xl border border-border/40 hover:border-border/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between space-y-3">
      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-muted/60 shrink-0">
            {AREA_ICONS[area.areaKey]}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground leading-tight">
              {area.title}
            </h3>
            <span className="text-[11px] text-muted-foreground block mt-0.5 italic">
              "{area.question}"
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {area.lifecycle === "COMPLETED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-600 rounded-full">
              Completed
            </span>
          )}
          {area.lifecycle === "IN_PROGRESS" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/15 text-blue-600 rounded-full">
              In Progress
            </span>
          )}
          {area.lifecycle === "REOPENED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/15 text-purple-600 rounded-full">
              Reopened
            </span>
          )}
          {area.lifecycle === "NOT_STARTED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
              Not Started
            </span>
          )}

          {area.validation === "READY" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
              Ready
            </span>
          )}
          {area.validation === "NEEDS_ATTENTION" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
              Needs Attention
            </span>
          )}
          {area.validation === "BLOCKED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full border border-rose-500/20">
              Blocked
            </span>
          )}
        </div>

        <div className="pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
            Latest Discovery:
          </span>
          {area.summary ? (
            <p className="text-foreground text-xs leading-snug line-clamp-2 italic font-medium">
              "{area.summary}"
            </p>
          ) : (
            <p className="text-muted-foreground/80 text-xs italic">
              No discovery notes logged yet.
            </p>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="text-[10px]">
          Updated {new Date(area.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={() => onContinueDiscovery(area)}
          className="inline-flex items-center gap-1 font-extrabold text-xs px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition shadow-2xs"
        >
          <span>Continue Discovery</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

{
  /* Operational Activity Group Section Component (IM-WP02B) */
}
function ActivityGroupSection({
  title,
  accentColor,
  activities,
  onComplete,
}: {
  title: string;
  accentColor: "rose" | "amber" | "blue" | "indigo" | "emerald";
  activities: InquiryActivity[];
  onComplete: (act: InquiryActivity) => void;
}) {
  const colorStyles = {
    rose: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  }[accentColor];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${accentColor === "rose" ? "bg-rose-500" : accentColor === "amber" ? "bg-amber-500" : accentColor === "blue" ? "bg-blue-500" : accentColor === "indigo" ? "bg-indigo-500" : "bg-emerald-500"}`}
        />
        <span>
          {title} ({activities.length})
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activities.map((act) => {
          const typeMeta =
            ACTIVITY_TYPE_LABELS[act.type] || ACTIVITY_TYPE_LABELS.FOLLOW_UP;
          const isCompleted = act.status === "COMPLETED";

          return (
            <div
              key={act.id}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                isCompleted
                  ? "bg-muted/30 border-border/25 opacity-70 grayscale-[20%]"
                  : "bg-card border-border/40 shadow-2xs hover:border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${isCompleted ? "bg-muted/40" : "bg-muted/60"}`}
                    >
                      {typeMeta.icon}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${isCompleted ? "bg-muted/50 text-muted-foreground/80" : "bg-muted text-muted-foreground"}`}
                    >
                      {typeMeta.label}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${isCompleted ? "bg-muted/40 text-muted-foreground border-border/30" : colorStyles}`}
                  >
                    {isCompleted ? "Completed" : `Priority: ${act.priority}`}
                  </span>
                </div>

                <h4
                  className={`text-xs font-extrabold leading-snug ${isCompleted ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}
                >
                  {act.title}
                </h4>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <div>
                    Due:{" "}
                    <span className="font-semibold text-foreground">
                      {act.dueDate}
                    </span>
                  </div>
                  <div>
                    Assigned:{" "}
                    <span className="font-semibold text-foreground">
                      {act.assignedTo}
                    </span>
                  </div>
                  {act.discoveryAreaKey && (
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                      <Tag className="w-3 h-3" />
                      <span>{act.discoveryAreaKey.replace("_", " ")}</span>
                    </div>
                  )}
                </div>

                {/* Outcome Display for Completed Activity */}
                {isCompleted && act.outcome && (
                  <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-950 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-700 block">
                      Outcome:
                    </span>
                    <p className="italic font-medium leading-snug">
                      "{act.outcome}"
                    </p>
                    {act.completedAt && (
                      <span className="text-[10px] text-emerald-700/80 block pt-0.5">
                        Completed on{" "}
                        {new Date(act.completedAt).toLocaleDateString()} by{" "}
                        {act.completedBy || "User"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {!isCompleted && (
                <div className="pt-2 border-t border-border/20 flex justify-end">
                  <button
                    onClick={() => onComplete(act)}
                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Activity</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
