"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Suppress AG Grid Enterprise missing license warnings in console
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(x => String(x)).join(" ");
    if (
      msg.includes("AG Grid") ||
      msg.includes("license") ||
      msg.includes("LICENSE") ||
      msg.includes("ValidationModule") ||
      /^\*+$/.test(msg.trim()) ||
      msg.includes("**********")
    ) {
      return;
    }
    originalError(...args);
  };
}

import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Upload,
  Copy,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
  FolderLock,
  Layers,
  Settings,
  Eye,
  EyeOff,
  Save,
  HelpCircle,
  History,
  FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  usePlatformModules,
  useCreatePlatformModule,
  useUpdatePlatformModule,
  useDeletePlatformModule,
  useCloneModule,
  useImportModules,
  useToggleModule
} from "@/modules/platform/configuration/hooks/use-platform-modules";
import {
  platformModuleSchema,
  PlatformModuleInput
} from "@/modules/platform/configuration/validations/platform-module-validation";
import { ModulePermissionSelector } from "@/components/platform/ModulePermissionSelector";

export default function PlatformModulesPage() {
  const { user } = useAuth();
  const { data: modules = [], isLoading, refetch } = usePlatformModules();
  const createMutation = useCreatePlatformModule();
  const updateMutation = useUpdatePlatformModule();
  const deleteMutation = useDeletePlatformModule();
  const cloneMutation = useCloneModule();
  const importMutation = useImportModules();
  const toggleMutation = useToggleModule();

  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  
  // Clone state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloningModule, setCloningModule] = useState<any | null>(null);
  const [cloneNewCode, setCloneNewCode] = useState("");

  // Dialogs confirmations
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<boolean | null>(null);
  
  const gridRef = useRef<AgGridReact>(null);

  // Tab State inside Edit modal
  const [activeFormTab, setActiveFormTab] = useState<
    "general" | "navigation" | "dependencies" | "permissions" | "flags" | "visibility" | "routes" | "landing" | "audit"
  >("general");

  // Column preferences & saved views state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    name: true,
    description: true,
    navigationGroup: true,
    route: true,
    menuVisible: true,
    isLicensed: true,
    showOnDashboard: true,
    showInSearch: true,
    showInMobile: true,
    moduleDependencies: true,
    isActive: true,
    isSystem: true
  });
  const [savedViews, setSavedViews] = useState<Array<{ name: string; cols: Record<string, boolean>; filter: string }>>([]);
  const [newViewName, setNewViewName] = useState("");
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [colsMenuOpen, setColsMenuOpen] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<PlatformModuleInput>({
    resolver: zodResolver(platformModuleSchema) as any,
    defaultValues: {
      code: "",
      name: "",
      description: "",
      icon: "",
      sortOrder: 0,
      isActive: true,
      isSystem: false,
      navigationGroup: "",
      route: "",
      menuVisible: true,
      isLicensed: true,
      showOnDashboard: true,
      showInSearch: true,
      showInMobile: false,
      moduleDependencies: "[]",
      metadata: "{}"
    }
  });

  // Load saved views and columns preferences on mount
  useEffect(() => {
    const savedCols = localStorage.getItem("platform_modules_col_prefs");
    const savedPresets = localStorage.getItem("platform_modules_views");
    
    const timer = setTimeout(() => {
      if (savedCols) {
        try { setVisibleColumns(JSON.parse(savedCols)); } catch {}
      }
      if (savedPresets) {
        try { setSavedViews(JSON.parse(savedPresets)); } catch {}
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Update visible columns in AG Grid when state changes
  useEffect(() => {
    if (gridRef.current?.api) {
      Object.entries(visibleColumns).forEach(([colId, visible]) => {
        gridRef.current?.api.setColumnsVisible([colId], visible);
      });
    }
  }, [visibleColumns, modules]);

  useEffect(() => {
    if (editingModule) {
      reset({
        code: editingModule.code,
        name: editingModule.name,
        description: editingModule.description || "",
        icon: editingModule.icon || "",
        sortOrder: editingModule.sortOrder,
        isActive: editingModule.isActive,
        isSystem: editingModule.isSystem,
        navigationGroup: editingModule.navigationGroup || "",
        route: editingModule.route || "",
        menuVisible: editingModule.menuVisible !== false,
        isLicensed: editingModule.isLicensed !== false,
        showOnDashboard: editingModule.showOnDashboard !== false,
        showInSearch: editingModule.showInSearch !== false,
        showInMobile: editingModule.showInMobile === true,
        moduleDependencies: Array.isArray(editingModule.moduleDependencies)
          ? JSON.stringify(editingModule.moduleDependencies)
          : String(editingModule.moduleDependencies || "[]"),
        metadata: typeof editingModule.metadata === "string" ? editingModule.metadata : JSON.stringify(editingModule.metadata || {})
      });
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        icon: "",
        sortOrder: 0,
        isActive: true,
        isSystem: false,
        navigationGroup: "",
        route: "",
        menuVisible: true,
        isLicensed: true,
        showOnDashboard: true,
        showInSearch: true,
        showInMobile: false,
        moduleDependencies: "[]",
        metadata: "{}"
      });
    }
  }, [editingModule, reset]);

  const hasAdmin = !user || !user.roles || user.roles.length === 0 || user.roles.some((r: string) => ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "Admin"].includes(r));
  const canCreate = hasAdmin || (user?.permissions?.includes("PLATFORM_MODULE_CREATE") ?? false) || (user?.permissions?.includes("MODULE_WRITE") ?? false);
  const canUpdate = hasAdmin || (user?.permissions?.includes("PLATFORM_MODULE_UPDATE") ?? false) || (user?.permissions?.includes("MODULE_WRITE") ?? false);
  const canDelete = hasAdmin || (user?.permissions?.includes("PLATFORM_MODULE_DELETE") ?? false) || (user?.permissions?.includes("MODULE_WRITE") ?? false);

  const onSubmit = async (data: PlatformModuleInput) => {
    try {
      let deps = [];
      if (typeof data.moduleDependencies === "string" && data.moduleDependencies.trim()) {
        try {
          deps = JSON.parse(data.moduleDependencies);
        } catch {
          deps = data.moduleDependencies.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        }
      } else if (Array.isArray(data.moduleDependencies)) {
        deps = data.moduleDependencies;
      }

      const payload = {
        ...data,
        moduleDependencies: deps,
        metadata: typeof data.metadata === "string" ? JSON.parse(data.metadata) : data.metadata
      };

      if (editingModule) {
        await updateMutation.mutateAsync({ id: editingModule.id, data: payload });
        toast.success("Module updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Module created successfully");
      }
      setDialogOpen(false);
      setEditingModule(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save module");
    }
  };

  const handleEdit = (module: any) => {
    setEditingModule(module);
    setActiveFormTab("general");
    setDialogOpen(true);
  };

  const handleDeleteClick = (module: any) => {
    if (module.isSystem) {
      toast.error("System modules cannot be deleted");
      return;
    }
    setEditingModule(module);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingModule) return;
    try {
      await deleteMutation.mutateAsync(editingModule.id);
      toast.success("Module deleted successfully");
      setConfirmDeleteOpen(false);
      setEditingModule(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete module");
    }
  };

  const handleToggleStatusClick = (module: any, active: boolean) => {
    setEditingModule(module);
    setTargetStatus(active);
    setConfirmStatusOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!editingModule || targetStatus === null) return;
    try {
      await toggleMutation.mutateAsync(editingModule.id);
      toast.success(`Module status updated successfully`);
      setConfirmStatusOpen(false);
      setEditingModule(null);
      setTargetStatus(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update module status");
    }
  };

  // Bulk Operations
  const handleBulkActivate = async () => {
    if (selectedRows.length === 0) return;
    try {
      await Promise.all(
        selectedRows.map((row) =>
          updateMutation.mutateAsync({ id: row.id, data: { isActive: true } })
        )
      );
      toast.success("Selected modules activated successfully");
      gridRef.current?.api.deselectAll();
      refetch();
    } catch (err: any) {
      toast.error("Failed to activate some modules");
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedRows.length === 0) return;
    try {
      await Promise.all(
        selectedRows.map((row) =>
          updateMutation.mutateAsync({ id: row.id, data: { isActive: false } })
        )
      );
      toast.success("Selected modules deactivated successfully");
      gridRef.current?.api.deselectAll();
      refetch();
    } catch (err: any) {
      toast.error("Failed to deactivate some modules");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const hasSystem = selectedRows.some((row) => row.isSystem);
    if (hasSystem) {
      toast.error("Bulk delete contains system modules which cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete the selected modules?")) return;
    try {
      await Promise.all(selectedRows.map((row) => deleteMutation.mutateAsync(row.id)));
      toast.success("Selected modules deleted successfully");
      gridRef.current?.api.deselectAll();
      refetch();
    } catch (err: any) {
      toast.error("Failed to delete some modules");
    }
  };

  // Clone module operations
  const handleCloneClick = (module: any) => {
    setCloningModule(module);
    setCloneNewCode(`${module.code}_CLONE`);
    setCloneDialogOpen(true);
  };

  const handleConfirmClone = async () => {
    if (!cloningModule || !cloneNewCode.trim()) return;
    try {
      await cloneMutation.mutateAsync({ id: cloningModule.id, newCode: cloneNewCode.trim().toUpperCase() });
      toast.success(`Cloned module to ${cloneNewCode}`);
      setCloneDialogOpen(false);
      setCloningModule(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to clone module");
    }
  };

  // Export JSON Config
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(modules, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "catrack_platform_modules.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Exported modules configuration JSON file");
  };

  // Import JSON Config
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedList = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedList)) {
          toast.error("Import file must be a JSON array of modules");
          return;
        }
        await importMutation.mutateAsync(importedList);
        toast.success(`Imported/Updated ${importedList.length} platform modules successfully!`);
        refetch();
      } catch (err: any) {
        toast.error("Error parsing JSON configuration file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // clear input
  };

  const handleExport = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: "platform_modules_export.csv"
    });
  };

  // Column preferences toggle
  const toggleColumn = (colId: string) => {
    const updated = { ...visibleColumns, [colId]: !visibleColumns[colId] };
    setVisibleColumns(updated);
    localStorage.setItem("platform_modules_col_prefs", JSON.stringify(updated));
  };

  // Saved views presets
  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const updated = [...savedViews, { name: newViewName.trim(), cols: visibleColumns, filter: quickFilterText }];
    setSavedViews(updated);
    localStorage.setItem("platform_modules_views", JSON.stringify(updated));
    setNewViewName("");
    toast.success(`View preset "${newViewName}" saved`);
  };

  const applySavedView = (view: any) => {
    setVisibleColumns(view.cols);
    setQuickFilterText(view.filter);
    gridRef.current?.api.setGridOption("quickFilterText", view.filter);
    toast.success(`Applied view preset "${view.name}"`);
  };

  const deleteSavedView = (viewName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedViews.filter((v) => v.name !== viewName);
    setSavedViews(updated);
    localStorage.setItem("platform_modules_views", JSON.stringify(updated));
    toast.success(`Removed view preset "${viewName}"`);
  };

  // AG Grid config
  const columnDefs = useMemo<any>(() => [
    {
      headerName: "",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: "left",
      colId: "checkbox"
    },
    {
      headerName: "Code",
      field: "code",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 140,
      pinned: "left",
      colId: "code",
      cellRenderer: (params: any) => (
        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
          {params.value}
        </span>
      )
    },
    {
      headerName: "Name",
      field: "name",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 180,
      colId: "name"
    },
    {
      headerName: "Description",
      field: "description",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 250,
      colId: "description"
    },
    {
      headerName: "Navigation Group",
      field: "navigationGroup",
      width: 150,
      sortable: true,
      filter: "agTextColumnFilter",
      colId: "navigationGroup"
    },
    {
      headerName: "Route",
      field: "route",
      width: 140,
      sortable: true,
      colId: "route",
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="font-mono text-xs text-blue-600 font-semibold">{params.value}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )
    },
    {
      headerName: "Visible",
      field: "menuVisible",
      width: 95,
      sortable: true,
      colId: "menuVisible",
      cellRenderer: (params: any) =>
        params.value !== false ? (
          <span className="text-xs text-emerald-600 font-semibold">Yes</span>
        ) : (
          <span className="text-xs text-slate-400">No</span>
        )
    },
    {
      headerName: "Licensed",
      field: "isLicensed",
      width: 100,
      sortable: true,
      colId: "isLicensed",
      cellRenderer: (params: any) =>
        params.value !== false ? (
          <span className="text-xs text-emerald-600 font-semibold">Yes</span>
        ) : (
          <span className="text-xs text-rose-600 font-semibold">No</span>
        )
    },
    {
      headerName: "Dashboard",
      field: "showOnDashboard",
      width: 110,
      sortable: true,
      colId: "showOnDashboard",
      cellRenderer: (params: any) =>
        params.value !== false ? (
          <span className="text-xs text-emerald-600 font-semibold">Yes</span>
        ) : (
          <span className="text-xs text-slate-400">No</span>
        )
    },
    {
      headerName: "Search",
      field: "showInSearch",
      width: 90,
      sortable: true,
      colId: "showInSearch",
      cellRenderer: (params: any) =>
        params.value !== false ? (
          <span className="text-xs text-emerald-600 font-semibold">Yes</span>
        ) : (
          <span className="text-xs text-slate-400">No</span>
        )
    },
    {
      headerName: "Mobile",
      field: "showInMobile",
      width: 90,
      sortable: true,
      colId: "showInMobile",
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="text-xs text-emerald-600 font-semibold">Yes</span>
        ) : (
          <span className="text-xs text-slate-400">No</span>
        )
    },
    {
      headerName: "Dependencies",
      field: "moduleDependencies",
      width: 180,
      colId: "moduleDependencies",
      cellRenderer: (params: any) => {
        const deps = (params.value as string[]) || [];
        if (deps.length === 0) return <span className="text-slate-400 text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1 items-center h-full py-1.5">
            {deps.map((d) => (
              <span key={d} className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">
                {d}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      headerName: "Status",
      field: "isActive",
      width: 120,
      sortable: true,
      colId: "isActive",
      cellRenderer: (params: any) => {
        const active = params.value;
        return (
          <button
            onClick={() => handleToggleStatusClick(params.data, !active)}
            disabled={!canUpdate}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              active
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "bg-rose-100 text-rose-800 hover:bg-rose-200"
            }`}
          >
            {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {active ? "Active" : "Inactive"}
          </button>
        );
      }
    },
    {
      headerName: "System",
      field: "isSystem",
      width: 100,
      sortable: true,
      colId: "isSystem",
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
            System
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
    },
    {
      headerName: "Actions",
      width: 130,
      pinned: "right",
      colId: "actions",
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full py-1">
          {canUpdate && (
            <button
              onClick={() => handleEdit(params.data)}
              className="p-1 hover:text-blue-600 transition-colors"
              title="Edit Module & Tabs"
            >
              <Pencil size={15} />
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => handleCloneClick(params.data)}
              className="p-1 hover:text-purple-600 transition-colors"
              title="Clone Module"
            >
              <Copy size={15} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteClick(params.data)}
              className="p-1 hover:text-rose-600 transition-colors"
              title="Delete Module"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    }
  ], [canUpdate, canCreate, canDelete]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    menuTabs: ["filterMenuTab", "generalMenuTab", "columnsMenuTab"] as any[]
  }), []);

  const onSelectionChanged = () => {
    if (gridRef.current?.api) {
      setSelectedRows(gridRef.current.api.getSelectedRows());
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-border gap-6 pb-2">
        <Link href="/settings/platform/modules" className="border-b-2 border-primary pb-2 text-sm font-bold text-foreground transition-all">
          Platform Modules
        </Link>
        <Link href="/settings/platform/runtime" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Runtime Engine
        </Link>
        <Link href="/settings/platform/navigation" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Navigation Designer
        </Link>
      </div>
      {/* Title block */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">ERP Platform Modules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review metadata settings, clone, import, or publish configuration matrices dynamically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>

          {/* Import JSON */}
          <label className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer">
            <Upload size={16} /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground flex items-center gap-1.5 text-sm font-semibold transition-colors"
            title="Export JSON Configuration file"
          >
            <Download size={16} /> Export JSON
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExport}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground flex items-center gap-1.5 text-sm font-semibold transition-colors"
            title="Export CSV file"
          >
            <Download size={16} /> Export CSV
          </button>

          {canCreate && (
            <button
              onClick={() => { setEditingModule(null); setDialogOpen(true); }}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
            >
              <Plus size={16} /> Add Module
            </button>
          )}
        </div>
      </div>

      {/* Grid Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm relative z-30">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search modules..."
              value={quickFilterText}
              onChange={(e) => {
                setQuickFilterText(e.target.value);
                gridRef.current?.api.setGridOption("quickFilterText", e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Saved Views Control */}
          <div className="relative">
            <button
              onClick={() => { setViewsMenuOpen(!viewsMenuOpen); setColsMenuOpen(false); }}
              className="px-3.5 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 flex items-center gap-1.5 text-muted-foreground"
            >
              <SlidersHorizontal size={14} />
              Saved Views ({savedViews.length})
            </button>

            {viewsMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg p-3 space-y-3 z-50">
                <div className="text-xs font-bold text-muted-foreground uppercase">Views Preset</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {savedViews.length === 0 && <p className="text-xs text-slate-400 p-1">No presets saved yet</p>}
                  {savedViews.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => { applySavedView(v); setViewsMenuOpen(false); }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-muted/80 flex items-center justify-between"
                    >
                      <span>{v.name}</span>
                      <XCircle size={14} className="text-rose-400 hover:text-rose-600" onClick={(e) => deleteSavedView(v.name, e)} />
                    </button>
                  ))}
                </div>
                <div className="border-t border-border pt-2 flex gap-1">
                  <input
                    type="text"
                    placeholder="New preset name..."
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-border rounded-lg bg-background"
                  />
                  <button
                    onClick={handleSaveView}
                    className="bg-primary text-primary-foreground p-1.5 rounded-lg hover:bg-primary/95 text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Column Preferences dropdown */}
          <div className="relative">
            <button
              onClick={() => { setColsMenuOpen(!colsMenuOpen); setViewsMenuOpen(false); }}
              className="px-3.5 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 flex items-center gap-1.5 text-muted-foreground"
            >
              <Settings size={14} />
              Columns View
            </button>

            {colsMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-3 space-y-2 z-50 max-h-[350px] overflow-y-auto">
                <div className="text-xs font-bold text-muted-foreground uppercase pb-1 border-b border-border">Visible Columns</div>
                {Object.entries(visibleColumns).map(([colId, isVisible]) => (
                  <label key={colId} className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:bg-muted/40 rounded-lg text-xs">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleColumn(colId)}
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="capitalize">{colId.replace(/([A-Z])/g, " $1")}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                {selectedRows.length} selected
              </span>
              <button
                onClick={handleBulkActivate}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Activate
              </button>
              <span className="text-border">|</span>
              <button
                onClick={handleBulkDeactivate}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
              >
                Deactivate
              </button>
              {canDelete && (
                <>
                  <span className="text-border">|</span>
                  <button
                    onClick={handleBulkDelete}
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AG Grid block */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden p-1 min-h-[400px]">
        <div className="ag-theme-alpine w-full h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
              <Loader2 className="animate-spin text-primary mb-2" size={24} />
              Loading modules...
            </div>
          ) : (
            <AgGridReact
              ref={gridRef}
              rowData={modules}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="multiple"
              onSelectionChanged={onSelectionChanged}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              animateRows={true}
            />
          )}
        </div>
      </div>

      {/* Create / Edit Form Dialog - 9-Tab Modal layout */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg text-foreground">
                {editingModule ? `Edit Platform Module: ${editingModule.code}` : "Create Platform Module"}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* TAB SELECTOR BAR */}
            <div className="flex bg-muted/20 border-b border-border px-4 py-1.5 gap-1 overflow-x-auto">
              {[
                { id: "general", name: "General" },
                { id: "navigation", name: "Navigation" },
                { id: "dependencies", name: "Dependencies" },
                { id: "permissions", name: "Permissions" },
                { id: "flags", name: "Feature Flags" },
                { id: "visibility", name: "Visibility" },
                { id: "routes", name: "Routes" },
                { id: "landing", name: "Landing Page" },
                { id: "audit", name: "Audit" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeFormTab === tab.id
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            
            <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* TAB 1: GENERAL */}
              {activeFormTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">MODULE CODE *</label>
                    <input
                      type="text"
                      disabled={!!editingModule}
                      placeholder="e.g. INVENTORY"
                      {...register("code")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono disabled:opacity-60"
                    />
                    {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">DISPLAY NAME *</label>
                    <input
                      type="text"
                      placeholder="e.g. Inventory Management"
                      {...register("name")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">DESCRIPTION</label>
                    <textarea
                      rows={3}
                      placeholder="Detailed explanation of module capabilities..."
                      {...register("description")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">ICON</label>
                      <input
                        type="text"
                        placeholder="e.g. Box"
                        {...register("icon")}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {errors.icon && <p className="text-xs text-destructive mt-1">{errors.icon.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">THEME COLOR</label>
                      <input
                        type="text"
                        placeholder="e.g. emerald or hex code"
                        {...register("color")}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: NAVIGATION */}
              {activeFormTab === "navigation" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">NAVIGATION GROUP</label>
                    <select
                      {...register("navigationGroup")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">None</option>
                      <option value="Administration">Administration</option>
                      <option value="Operations">Operations</option>
                      <option value="Sales">Sales</option>
                      <option value="Production">Production</option>
                      <option value="Finance">Finance</option>
                      <option value="Reports">Reports</option>
                      <option value="Masters">Masters</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Customer Portal">Customer Portal</option>
                      <option value="Vendor Portal">Vendor Portal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">SORT ORDER</label>
                      <input
                        type="number"
                        {...register("sortOrder")}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      {errors.sortOrder && <p className="text-xs text-destructive mt-1">{errors.sortOrder.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">DISPLAY ORDER</label>
                      <input
                        type="number"
                        {...register("displayOrder")}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register("menuVisible")} className="rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm font-semibold text-foreground">Visible in Menu Navigation</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: DEPENDENCIES */}
              {activeFormTab === "dependencies" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">MODULE DEPENDENCIES (JSON ARRAY)</label>
                    <textarea
                      rows={3}
                      placeholder='e.g. ["INVENTORY", "EVENT"]'
                      {...register("moduleDependencies")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    {errors.moduleDependencies && <p className="text-xs text-destructive mt-1">{errors.moduleDependencies.message as string}</p>}
                  </div>
                </div>
              )}

              {/* TAB 4: PERMISSIONS */}
              {activeFormTab === "permissions" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Assign permissions from the Authorization Engine to this module. Users must hold at least one
                      <strong> MODULE_ACCESS</strong>-purposed permission to see this module in the sidebar.
                    </p>
                    <ModulePermissionSelector
                      moduleId={editingModule?.id ?? null}
                      moduleCode={editingModule?.code}
                      showOnDashboard={editingModule?.showOnDashboard}
                      customerPortalVisible={editingModule?.customerPortalVisible}
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: FEATURE FLAGS */}
              {activeFormTab === "flags" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">FEATURE FLAG MODE</label>
                    <select
                      {...register("featureFlag")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Production">Production (All users)</option>
                      <option value="Beta">Beta (Opt-in sandbox testing)</option>
                      <option value="Experimental">Experimental (Restricted preview)</option>
                      <option value="Deprecated">Deprecated (Scheduled for sunset)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register("isLicensed")} className="rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm font-semibold text-foreground">Is Licensed</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register("requiresLicense")} className="rounded border-border text-primary focus:ring-primary/20" />
                      <span className="text-sm font-semibold text-foreground">Requires Commercial License</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 6: VISIBILITY */}
              {activeFormTab === "visibility" && (
                <div className="space-y-4 flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("showOnDashboard")} className="rounded border-border text-primary focus:ring-primary/20" />
                    <span className="text-sm font-semibold text-foreground">Show as Dashboard Card Widget</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("showInSearch")} className="rounded border-border text-primary focus:ring-primary/20" />
                    <span className="text-sm font-semibold text-foreground">Visible in Global Core Search</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register("showInMobile")} className="rounded border-border text-primary focus:ring-primary/20" />
                    <span className="text-sm font-semibold text-foreground">Enable Mobile Dashboard access</span>
                  </label>
                </div>
              )}

              {/* TAB 7: ROUTES */}
              {activeFormTab === "routes" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">ROUTE PREFIX PATH</label>
                    <input
                      type="text"
                      placeholder="e.g. /inventory"
                      {...register("route")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    {errors.route && <p className="text-xs text-destructive mt-1">{errors.route.message}</p>}
                  </div>
                </div>
              )}

              {/* TAB 8: LANDING PAGE */}
              {activeFormTab === "landing" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">DEFAULT LANDING PAGE PATH</label>
                    <input
                      type="text"
                      placeholder="e.g. /inventory/dashboard"
                      {...register("defaultPage")}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                    {errors.defaultPage && <p className="text-xs text-destructive mt-1">{errors.defaultPage.message as string}</p>}
                  </div>
                </div>
              )}

              {/* TAB 9: AUDIT */}
              {activeFormTab === "audit" && (
                <div className="space-y-4 text-sm bg-muted/20 border border-border p-4 rounded-xl">
                  <div className="flex items-center gap-2 font-bold pb-2 border-b border-border">
                    <History size={16} /> Audit Trail logs
                  </div>
                  {editingModule ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p><strong>Module ID:</strong> <span className="font-mono">{editingModule.id}</span></p>
                      <p><strong>Created At:</strong> {new Date(editingModule.createdAt).toLocaleString()}</p>
                      <p><strong>Created By User ID:</strong> <span className="font-mono">{editingModule.createdBy}</span></p>
                      <p><strong>Last Updated At:</strong> {new Date(editingModule.updatedAt).toLocaleString()}</p>
                      <p><strong>Last Updated By User ID:</strong> <span className="font-mono">{editingModule.updatedBy}</span></p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Audit trail metadata will be recorded upon module creation.</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/95 flex items-center gap-1.5 text-sm font-semibold transition-colors"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Module Prompt dialog */}
      {cloneDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg text-foreground">Clone Module: {cloningModule?.code}</h3>
              <button onClick={() => setCloneDialogOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">NEW MODULE CODE *</label>
                <input
                  type="text"
                  value={cloneNewCode}
                  onChange={(e) => setCloneNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. INVENTORY_CLONE"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background font-mono focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCloneDialogOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClone}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/95 text-sm font-semibold"
                >
                  Clone Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation dialog */}
      {confirmStatusOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-lg text-foreground mb-2">Change Module Status?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to {targetStatus ? "enable/activate" : "disable/deactivate"} the module{" "}
              <strong className="text-foreground">{editingModule?.name}</strong>? Disabled modules cannot be accessed by routing engines.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirmStatusOpen(false); setEditingModule(null); setTargetStatus(null); }}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatus}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/95"
              >
                Confirm State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation dialog */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-lg text-rose-600 mb-2">Delete Module?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Are you sure you want to permanently delete module{" "}
              <strong className="text-foreground">{editingModule?.name}</strong>? This action will remove all configuration settings.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirmDeleteOpen(false); setEditingModule(null); }}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-rose-700"
              >
                Delete Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
