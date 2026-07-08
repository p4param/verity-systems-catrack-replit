"use client";

import React, { useState, useMemo } from "react";
import {
  useRuntimeModules,
  useToggleModule,
  useReorderModules,
  usePublishRuntime,
  useUpdatePlatformModule
} from "@/modules/platform/configuration/hooks/use-platform-modules";
import {
  FolderLock,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  GripVertical,
  Activity,
  Layers,
  FileCheck,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Loader2,
  Settings,
  Eye,
  CheckSquare,
  Square,
  LayoutDashboard,
  Search,
  Smartphone,
  ShieldCheck,
  Play,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import Link from "next/link";

export default function PlatformRuntimePage() {
  const { user } = useAuth();
  const { data: runtimeData, isLoading, refetch } = useRuntimeModules();
  const toggleMutation = useToggleModule();
  const reorderMutation = useReorderModules();
  const publishMutation = usePublishRuntime();
  const updateMutation = useUpdatePlatformModule();

  const [activeTab, setActiveTab] = useState<"tree" | "matrix" | "publish">("tree");
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);

  // Publish Pipeline Stepper
  const [pipelineStep, setPipelineStep] = useState<"validate" | "preview" | "publish">("validate");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);

  // Dependency Editor Dialog state
  const [depEditorOpen, setDepEditorOpen] = useState(false);
  const [depEditingModule, setDepEditingModule] = useState<any | null>(null);
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

  const modules = useMemo(() => runtimeData?.modules || [], [runtimeData?.modules]);
  const validation = useMemo(() => runtimeData?.validation || { isValid: true, anomalies: [] }, [runtimeData?.validation]);

  const canUpdate = user?.permissions?.includes("PLATFORM_MODULE_UPDATE");

  // Dependency Matrix Calculation
  const dependencyMatrix = useMemo(() => {
    return modules.map((m: any) => {
      const code = m.code;
      const dependsOn = Array.isArray(m.moduleDependencies) ? m.moduleDependencies : [];
      
      // Calculate "Required By"
      const requiredBy = modules
        .filter((other: any) => {
          const otherDeps = Array.isArray(other.moduleDependencies) ? other.moduleDependencies : [];
          return otherDeps.includes(code);
        })
        .map((other: any) => other.code);

      // Check missing deps
      const missingDeps = dependsOn.filter((d: string) => !modules.some((other: any) => other.code === d));
      
      // Check broken parent
      const brokenDeps = dependsOn.filter((d: string) => {
        const target = modules.find((other: any) => other.code === d);
        return target && !target.isActive;
      });

      return {
        module: m,
        dependsOn,
        requiredBy,
        missingDeps,
        brokenDeps
      };
    });
  }, [modules]);

  // Health Score Gauge Calculation
  const healthMetrics = useMemo(() => {
    const errorCount = validation.anomalies.filter((a: any) => a.severity === "ERROR").length;
    const warnCount = validation.anomalies.filter((a: any) => a.severity === "WARNING").length;

    if (errorCount > 0) {
      return { status: "CRITICAL", text: "Critical anomalies detected", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900" };
    }
    if (warnCount > 0) {
      return { status: "WARNING", text: "Runtime warnings present", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900" };
    }
    return { status: "HEALTHY", text: "System fully healthy", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" };
  }, [validation]);

  const handleToggleActive = async (id: string, name: string) => {
    if (!canUpdate) return;
    try {
      await toggleMutation.mutateAsync(id);
      toast.success(`Toggled active state for: ${name}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle module state");
    }
  };

  // Drag and drop for Navigation sorting
  const handleDragStart = (id: string) => {
    setDraggedModuleId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedModuleId || draggedModuleId === targetId || !canUpdate) return;

    const orderedIds = [...modules.map((m: any) => m.id)];
    const draggedIndex = orderedIds.indexOf(draggedModuleId);
    const targetIndex = orderedIds.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      orderedIds.splice(draggedIndex, 1);
      orderedIds.splice(targetIndex, 0, draggedModuleId);

      try {
        await reorderMutation.mutateAsync(orderedIds);
        toast.success("Module display order updated");
        await refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to reorder modules");
      }
    }
    setDraggedModuleId(null);
  };

  // Group modules for nav tree representation
  const groupedModules = useMemo(() => {
    const map: Record<string, any[]> = {};
    const VALID_GROUPS = [
      "Administration", "Operations", "Sales", "Production", "Finance",
      "Reports", "Masters", "Utilities", "Mobile", "Customer Portal", "Vendor Portal"
    ];
    VALID_GROUPS.forEach(g => { map[g] = []; });
    
    modules.forEach((m: any) => {
      const g = m.navigationGroup || "Unclassified";
      if (!map[g]) map[g] = [];
      map[g].push(m);
    });

    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => a.displayOrder - b.displayOrder);
    });
    return map;
  }, [modules]);

  // Open Dependency Editor Popup Modal
  const openDependencyEditor = (item: any) => {
    setDepEditingModule(item.module);
    setSelectedDeps(Array.isArray(item.module.moduleDependencies) ? item.module.moduleDependencies : []);
    setDepEditorOpen(true);
  };

  const toggleDepSelection = (code: string) => {
    if (selectedDeps.includes(code)) {
      setSelectedDeps(selectedDeps.filter(c => c !== code));
    } else {
      setSelectedDeps([...selectedDeps, code]);
    }
  };

  const handleSaveDependencies = async () => {
    if (!depEditingModule) return;
    try {
      await updateMutation.mutateAsync({
        id: depEditingModule.id,
        data: { moduleDependencies: selectedDeps }
      });
      toast.success(`Updated dependencies mapping for ${depEditingModule.name}`);
      setDepEditorOpen(false);
      setDepEditingModule(null);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update dependencies");
    }
  };

  // Publish flow pipeline
  const handlePublishRuntime = async () => {
    setPublishing(true);
    try {
      const res = await publishMutation.mutateAsync();
      setPublishResult(res);
      toast.success("Platform runtime successfully published & invalidated navigation caches");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish runtime cache");
    } finally {
      setPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-muted-foreground">
        <Loader2 className="animate-spin text-primary mb-2" size={32} />
        Loading configuration runtime matrices...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-border gap-6 pb-2">
        <Link href="/settings/platform/modules" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Platform Modules
        </Link>
        <Link href="/settings/platform/runtime" className="border-b-2 border-primary pb-2 text-sm font-bold text-foreground transition-all">
          Runtime Engine
        </Link>
        <Link href="/settings/platform/navigation" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Navigation Designer
        </Link>
      </div>
      {/* Title */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Runtime Engine</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Inspect active database configurations, dependencies, cycle detection graphs, and landing pages.
            </p>
          </div>
        </div>
      </div>

      {/* Grid Tabs Selector */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm relative z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("tree")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "tree" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Navigation Groups Tree
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "matrix" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Dependencies Matrix
          </button>
          <button
            onClick={() => setActiveTab("publish")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === "publish" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Publish Runtime Pipeline
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main content panel based on Tab Selection */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* TAB 1: NAVIGATION GROUPS TREE */}
          {activeTab === "tree" && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Live Navigation Groups Tree</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Structure layout hierarchy. Drag-and-drop sorted modules inside group containers.
                </p>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedModules).map(([group, groupMods]) => {
                  if (groupMods.length === 0) return null;
                  return (
                    <div key={group} className="space-y-2 border-l-2 border-border pl-4 ml-2">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        {group} ({groupMods.length})
                      </h3>

                      <div className="space-y-1.5">
                        {groupMods.map((m: any) => (
                          <div
                            key={m.id}
                            draggable={canUpdate}
                            onDragStart={() => handleDragStart(m.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(m.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border bg-background transition-all hover:shadow-sm ${
                              m.isActive ? "border-border" : "border-border opacity-50 bg-muted/10"
                            } ${draggedModuleId === m.id ? "opacity-35 bg-primary/5 border-dashed" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              {canUpdate && (
                                <span className="text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600">
                                  <GripVertical size={16} />
                                </span>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-foreground">{m.name}</span>
                                  <span className="font-mono text-xxs bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                    {m.code}
                                  </span>
                                  {m.isSystem && (
                                    <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold border border-blue-200 dark:border-blue-900">
                                      System
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Route Path: <span className="font-mono text-blue-500 font-semibold">{m.route || "None"}</span>
                                  {m.defaultPage && (
                                    <span className="ml-2 pl-2 border-l border-border">
                                      Landing: <span className="font-mono text-emerald-600">{m.defaultPage}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleActive(m.id, m.name)}
                              disabled={!canUpdate}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                                m.isActive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                              }`}
                            >
                              {m.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                              {m.isActive ? "Active" : "Inactive"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DEPENDENCIES MATRIX */}
          {activeTab === "matrix" && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Interactive Dependency Matrix</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual mapping of modules interactions. Click any row item to edit parent dependency chains.
                </p>
              </div>

              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-background">
                {dependencyMatrix.map((item) => (
                  <div
                    key={item.module.id}
                    onClick={() => canUpdate && openDependencyEditor(item)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{item.module.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">({item.module.code})</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.module.description || "No description configured."}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end text-xs">
                      <div>
                        <strong className="text-slate-400 mr-2">Depends On:</strong>
                        {item.dependsOn.length > 0 ? (
                          <span className="font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded">
                            {item.dependsOn.join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </div>

                      <div>
                        <strong className="text-slate-400 mr-2">Required By:</strong>
                        {item.requiredBy.length > 0 ? (
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">
                            {item.requiredBy.join(", ")}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </div>

                      {/* Display dependency anomalies inside matrix item row */}
                      {item.missingDeps.length > 0 && (
                        <div className="flex items-center gap-1 text-rose-500 font-semibold text-xxs bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          <AlertTriangle size={12} />
                          Missing Parent: {item.missingDeps.join(", ")}
                        </div>
                      )}
                      {item.brokenDeps.length > 0 && (
                        <div className="flex items-center gap-1 text-amber-600 font-semibold text-xxs bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                          <AlertTriangle size={12} />
                          Required Disabled: {item.brokenDeps.map(d => d).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PUBLISH RUNTIME PIPELINE */}
          {activeTab === "publish" && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Publish Runtime Stepper</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Progress pipeline: Validate configurations &rarr; Preview dynamic layouts &rarr; Publish live runtime caches.
                </p>
              </div>

              {/* Stepper bar */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <button
                  onClick={() => setPipelineStep("validate")}
                  className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-all ${
                    pipelineStep === "validate" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1. Validate Engine
                </button>
                <button
                  onClick={() => setPipelineStep("preview")}
                  className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-all ${
                    pipelineStep === "preview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2. Preview Runtime
                </button>
                <button
                  onClick={() => setPipelineStep("publish")}
                  className={`flex-1 text-center py-2 text-sm font-semibold border-b-2 transition-all ${
                    pipelineStep === "publish" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  3. Publish Changes
                </button>
              </div>

              {/* STEP 1: VALIDATE ENGINE */}
              {pipelineStep === "validate" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-foreground">Validation Integrity Summary</span>
                    <button
                      onClick={() => refetch()}
                      className="text-xs font-semibold flex items-center gap-1 text-primary hover:underline"
                    >
                      <RefreshCw size={12} /> Re-run validation checks
                    </button>
                  </div>

                  {validation.anomalies.length === 0 ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex gap-3">
                      <CheckCircle size={18} className="shrink-0 text-emerald-600" />
                      <div>
                        <strong>All check items clean!</strong> System contains no circular paths, duplicate routes, or missing configuration pointers. Ready to publish.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto border border-border rounded-xl p-3 bg-background divide-y divide-border">
                      {validation.anomalies.map((a: any, i: number) => (
                        <div key={i} className="py-2.5 flex items-start gap-2.5 text-xs first:pt-0 last:pb-0">
                          <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${a.severity === "ERROR" ? "text-rose-600" : "text-amber-600"}`} />
                          <div>
                            <span className={`font-bold uppercase text-[10px] tracking-wider px-1.5 py-0.2 rounded ${
                              a.severity === "ERROR" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {a.type}
                            </span>
                            <p className="mt-1 text-muted-foreground leading-relaxed">{a.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setPipelineStep("preview")}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/95"
                    >
                      Continue to Preview
                      <Play size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PREVIEW RUNTIME LAYOUT */}
              {pipelineStep === "preview" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Generated Live Navigation Sidebar Preview</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Mock representation of the generated left-hand menu tree.</p>
                  </div>

                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-sans text-xs space-y-4 border border-slate-800">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                      <span className="text-slate-400 font-mono ml-2">Varity Systems ERP Dashboard</span>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(groupedModules).map(([group, groupMods]) => {
                        const activeMods = groupMods.filter(m => m.isActive && m.menuVisible);
                        if (activeMods.length === 0) return null;
                        return (
                          <div key={group} className="space-y-1">
                            <span className="text-slate-500 uppercase tracking-widest font-bold text-[9px] block">
                              {group}
                            </span>
                            <div className="pl-2 space-y-1 border-l border-slate-800">
                              {activeMods.map(m => (
                                <div key={m.id} className="flex items-center gap-2 text-slate-300 py-1 hover:text-white">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                                  <span>{m.name}</span>
                                  <span className="font-mono text-[9px] text-slate-500 ml-auto">{m.route}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setPipelineStep("validate")}
                      className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setPipelineStep("publish")}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/95"
                    >
                      Proceed to Publish
                      <Play size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PUBLISH CONFIG CHANGES */}
              {pipelineStep === "publish" && (
                <div className="space-y-6 text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                    <ShieldCheck size={36} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Publish Configurations to Core Platform Cache</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Publishing triggers metadata compilation, serializes search mappings, aggregates landing indices, and records audit logs.
                    </p>
                  </div>

                  {publishResult && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs text-left max-w-md mx-auto space-y-1.5">
                      <p><strong>Published At:</strong> {new Date(publishResult.publishedAt).toLocaleString()}</p>
                      <p><strong>Calculated Health:</strong> <span className="font-bold">{publishResult.healthStatus}</span></p>
                      <p><strong>Generated Navigation groups:</strong> {publishResult.generated?.navigationTree?.filter((t: any) => t.modules.length > 0).length} groups active</p>
                      <p><strong>Audited Activity:</strong> Completed</p>
                    </div>
                  )}

                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setPipelineStep("preview")}
                      className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePublishRuntime}
                      disabled={publishing || !validation.isValid}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-60"
                    >
                      {publishing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      Publish Config Matrix
                    </button>
                  </div>
                  {!validation.isValid && (
                    <p className="text-[10px] text-rose-500 font-semibold">
                      ⚠️ Cannot publish configurations while Critical anomalies exist.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right validation widget column */}
        <div className="space-y-4">
          
          {/* HEALTH GAUGE CARD */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShieldAlert size={18} className="text-primary" />
              Runtime Health Gauge
            </h3>

            <div className={`p-4 border rounded-xl flex items-start gap-3 ${healthMetrics.bg}`}>
              <div className="shrink-0 mt-0.5">
                {healthMetrics.status === "HEALTHY" && <CheckCircle size={18} className="text-emerald-600" />}
                {healthMetrics.status === "WARNING" && <AlertTriangle size={18} className="text-amber-600" />}
                {healthMetrics.status === "CRITICAL" && <AlertTriangle size={18} className="text-rose-600" />}
              </div>
              <div>
                <div className={`font-bold text-sm ${healthMetrics.color}`}>
                  Health: {healthMetrics.status}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {healthMetrics.text}. Anomalies count: <strong className="text-foreground">{validation.anomalies.length}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xxs text-muted-foreground border-t border-border pt-3 divide-y divide-border">
              <div className="flex justify-between py-1.5">
                <span>Duplicate Routes:</span>
                <span className="font-bold text-foreground">
                  {validation.anomalies.filter((a: any) => a.type === "DUPLICATE_ROUTE").length}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Circular Mappings:</span>
                <span className="font-bold text-foreground">
                  {validation.anomalies.filter((a: any) => a.type === "CIRCULAR_DEPENDENCY").length}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Broken Pointers:</span>
                <span className="font-bold text-foreground">
                  {validation.anomalies.filter((a: any) => a.type === "BROKEN_PARENT" || a.type === "BROKEN_DEPENDENCY").length}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Missing Navigation Groups:</span>
                <span className="font-bold text-foreground">
                  {validation.anomalies.filter((a: any) => a.type === "MISSING_NAVIGATION_GROUP").length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <HelpCircle size={15} className="text-primary" />
              Runtime Preview Details
            </h3>
            <div className="text-xxs text-muted-foreground leading-relaxed space-y-2">
              <p><strong>Sidebar Menus:</strong> Populates side navigation links dynamically based on activated settings.</p>
              <p><strong>Dashboard Mappings:</strong> Aggregates cards and quick action indicators.</p>
              <p><strong>Global Search:</strong> Index visibility settings allow administrators to toggle module keywords.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dependency Editor Modal Dialog */}
      {depEditorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg text-foreground">Edit Dependencies: {depEditingModule?.code}</h3>
              <button onClick={() => setDepEditorOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">Select the parent modules this module depends on:</p>
              
              <div className="space-y-2">
                {modules
                  .filter((m: any) => m.code !== depEditingModule?.code)
                  .map((m: any) => {
                    const isSelected = selectedDeps.includes(m.code);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleDepSelection(m.code)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer hover:bg-muted/30 transition-all ${
                          isSelected ? "border-primary bg-primary/5" : "border-border bg-background"
                        }`}
                      >
                        {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-slate-400" />}
                        <div>
                          <div className="font-bold text-xs text-foreground">{m.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{m.code}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => setDepEditorOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDependencies}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/95"
                >
                  Save Mapping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
