"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Copy,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Layers,
  ChevronRight,
  Eye,
  FileBox,
  FileCheck,
  FileQuestion,
  Database,
  Building,
  MonitorSmartphone,
  FolderOpen,
  Rocket
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useEntities,
  useDeleteEntity,
  useArchiveEntity,
  useRestoreEntity,
  useDuplicateEntity,
  usePublishEntity
} from "@/modules/platform/configuration/hooks/use-entities";
import { PublishDialog } from "./components/publish-dialog";

export default function EntitiesListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: entities = [], isLoading, refetch } = useEntities();
  const deleteMutation = useDeleteEntity();
  const archiveMutation = useArchiveEntity();
  const restoreMutation = useRestoreEntity();
  const duplicateMutation = useDuplicateEntity();
  const publishMutation = usePublishEntity();

  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [entityToPublish, setEntityToPublish] = useState<any>(null);
  
  // Custom quick filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  
  const gridRef = useRef<AgGridReact>(null);

  const canCreate = user?.permissions?.includes("PLATFORM_ENTITY_CREATE") ?? true;
  const canUpdate = user?.permissions?.includes("PLATFORM_ENTITY_EDIT") ?? true;
  const canDelete = user?.permissions?.includes("PLATFORM_ENTITY_DELETE") ?? true;

  const handleEditClick = (entity: any) => {
    router.push(`/settings/platform/entities/${entity.id}`);
  };

  const handleDuplicateClick = async (entity: any) => {
    try {
      await duplicateMutation.mutateAsync(entity.id);
      toast.success(`Entity ${entity.name} duplicated successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate entity");
    }
  };

  const handleArchiveClick = async (entity: any) => {
    if (entity.isSystem) {
      toast.error("System entities cannot be archived");
      return;
    }
    try {
      await archiveMutation.mutateAsync(entity.id);
      toast.success(`Entity ${entity.name} archived successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to archive entity");
    }
  };

  const handleRestoreClick = async (entity: any) => {
    try {
      await restoreMutation.mutateAsync(entity.id);
      toast.success(`Entity ${entity.name} restored successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore entity");
    }
  };

  const handleDeleteClick = async (entity: any) => {
    if (entity.isSystem) {
      toast.error("System entities cannot be deleted");
      return;
    }
    if (entity.status === "PUBLISHED") {
      toast.error("Published entities cannot be deleted. Archive them instead.");
      return;
    }
    if (!confirm(`Are you sure you want to hard delete the entity '${entity.name}'?`)) return;
    try {
      await deleteMutation.mutateAsync(entity.id);
      toast.success(`Entity ${entity.name} deleted successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete entity");
    }
  };

  const handlePublishClick = (entity: any) => {
    setEntityToPublish(entity);
    setPublishDialogOpen(true);
  };

  // Bulk Operations
  const handleBulkArchive = async () => {
    if (selectedRows.length === 0) return;
    const hasSystem = selectedRows.some((row) => row.isSystem);
    if (hasSystem) {
      toast.error("Bulk archive contains system entities which cannot be archived");
      return;
    }
    try {
      await Promise.all(selectedRows.map((row) => archiveMutation.mutateAsync(row.id)));
      toast.success("Selected entities archived successfully");
      gridRef.current?.api.deselectAll();
    } catch (err: any) {
      toast.error("Failed to archive some entities");
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRows.length === 0) return;
    try {
      await Promise.all(selectedRows.map((row) => restoreMutation.mutateAsync(row.id)));
      toast.success("Selected entities restored successfully");
      gridRef.current?.api.deselectAll();
    } catch (err: any) {
      toast.error("Failed to restore some entities");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const hasSystem = selectedRows.some((row) => row.isSystem);
    if (hasSystem) {
      toast.error("Bulk delete contains system entities which cannot be deleted");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedRows.length} entities?`)) return;
    try {
      await Promise.all(selectedRows.map((row) => deleteMutation.mutateAsync(row.id)));
      toast.success("Selected entities deleted successfully");
      gridRef.current?.api.deselectAll();
    } catch (err: any) {
      toast.error("Failed to delete some entities");
    }
  };

  const handleBulkPublish = async () => {
    if (selectedRows.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;
    for (const row of selectedRows) {
      try {
        await publishMutation.mutateAsync(row.id);
        successCount++;
      } catch (err: any) {
        failCount++;
      }
    }
    
    if (successCount > 0) toast.success(`${successCount} entities published successfully`);
    if (failCount > 0) toast.error(`${failCount} entities failed validation and could not be published.`);
    
    gridRef.current?.api.deselectAll();
  };

  const handleExport = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: "catrack_business_entities.csv"
    });
  };

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
    },
    {
      headerName: "Module",
      field: "module.name",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 150,
      cellRenderer: (params: any) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 h-full">
          <FolderOpen size={12} />
          {params.value || "Platform"}
        </span>
      )
    },
    {
      headerName: "API Name",
      field: "apiName",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 150,
      cellRenderer: (params: any) => (
        <span className="font-mono text-xs text-blue-600 font-semibold">{params.value || "—"}</span>
      )
    },
    {
      headerName: "Status",
      field: "status",
      width: 120,
      sortable: true,
      cellRenderer: (params: any) => {
        const s = params.value;
        const badgeClasses = {
          PUBLISHED: "bg-emerald-100 text-emerald-800 border-emerald-200",
          VALIDATED: "bg-blue-100 text-blue-800 border-blue-200",
          ARCHIVED: "bg-orange-100 text-orange-800 border-orange-200",
          INACTIVE: "bg-rose-100 text-rose-800 border-rose-200",
          DRAFT: "bg-slate-100 text-slate-700 border-slate-200"
        }[s as string] || "bg-slate-100 text-slate-700 border-slate-200";

        return (
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${badgeClasses}`}>
            {s}
          </span>
        );
      }
    },
    {
      headerName: "Active",
      field: "isActive",
      width: 100,
      sortable: true,
      cellRenderer: (params: any) => (
        params.value ? (
          <span className="text-xs text-emerald-600 font-semibold flex items-center h-full">Yes</span>
        ) : (
          <span className="text-xs text-slate-400 flex items-center h-full">No</span>
        )
      )
    },
    {
      headerName: "Type",
      field: "isSystem",
      width: 100,
      sortable: true,
      cellRenderer: (params: any) =>
        params.value ? (
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold border border-indigo-200">
            System
          </span>
        ) : (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold border border-purple-200">
            Custom
          </span>
        )
    },
    {
      headerName: "Actions",
      width: 160,
      pinned: "right",
      cellRenderer: (params: any) => (
        <div className="flex items-center gap-2 h-full py-1">
          <button
            onClick={() => handleEditClick(params.data)}
            className="p-1 hover:text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          {canUpdate && (
            <button
              onClick={() => handleEditClick(params.data)}
              className="p-1 hover:text-blue-600 transition-colors"
              title="Edit Entity"
            >
              <Pencil size={15} />
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => handleDuplicateClick(params.data)}
              className="p-1 hover:text-purple-600 transition-colors"
              title="Duplicate Entity"
            >
              <Copy size={15} />
            </button>
          )}
          {canUpdate && params.data.status !== "PUBLISHED" && (
            <button
              onClick={() => handlePublishClick(params.data)}
              className="p-1 hover:text-emerald-600 transition-colors"
              title="Publish Entity"
            >
              <Rocket size={15} />
            </button>
          )}
          {canDelete && params.data.status !== "ARCHIVED" && !params.data.isSystem && (
            <button
              onClick={() => handleArchiveClick(params.data)}
              className="p-1 hover:text-orange-600 transition-colors"
              title="Archive Entity"
            >
              <Archive size={15} />
            </button>
          )}
          {canDelete && params.data.status === "ARCHIVED" && (
            <button
              onClick={() => handleRestoreClick(params.data)}
              className="p-1 hover:text-emerald-600 transition-colors"
              title="Restore Entity"
            >
              <ArchiveRestore size={15} />
            </button>
          )}
          {canDelete && params.data.status === "DRAFT" && !params.data.isSystem && (
            <button
              onClick={() => handleDeleteClick(params.data)}
              className="p-1 hover:text-rose-600 transition-colors"
              title="Delete Entity"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    }
  ], [canUpdate, canCreate, canDelete, router]);

  const onSelectionChanged = () => {
    if (gridRef.current?.api) {
      setSelectedRows(gridRef.current.api.getSelectedRows());
    }
  };

  const onRowDoubleClicked = (e: any) => {
    handleEditClick(e.data);
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((e: any) => {
      if (statusFilter !== "ALL" && e.status !== statusFilter) return false;
      if (typeFilter !== "ALL") {
        if (typeFilter === "SYSTEM" && !e.isSystem) return false;
        if (typeFilter === "CUSTOM" && e.isSystem) return false;
      }
      if (activeFilter !== "ALL") {
        if (activeFilter === "ACTIVE" && !e.isActive) return false;
        if (activeFilter === "INACTIVE" && e.isActive) return false;
      }
      return true;
    });
  }, [entities, statusFilter, typeFilter, activeFilter]);

  // Dashboard calculations
  const totalCount = entities.length;
  const draftCount = entities.filter((e: any) => e.status === "DRAFT").length;
  const publishedCount = entities.filter((e: any) => e.status === "PUBLISHED").length;
  const archivedCount = entities.filter((e: any) => e.status === "ARCHIVED").length;
  const systemCount = entities.filter((e: any) => e.isSystem).length;
  const customCount = entities.filter((e: any) => !e.isSystem).length;
  const navCount = entities.filter((e: any) => e.showInNavigation).length;

  const noRowsOverlayComponent = useCallback(() => {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold mb-1">No Entities Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          There are no business entities matching your criteria. Create your first entity to get started.
        </p>
        {canCreate && (
          <button
            onClick={() => router.push("/settings/platform/entities/new")}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Create First Entity
          </button>
        )}
      </div>
    );
  }, [canCreate, router]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
        <ChevronRight size={14} />
        <Link href="/settings/platform" className="hover:text-foreground transition-colors">Platform</Link>
        <ChevronRight size={14} />
        <span className="text-foreground">Business Entities</span>
      </div>

      {/* Title block */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Business Entity Registry</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Authoritative registry of all metadata-defined business entities.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors"
            title="Refresh Registry"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground flex items-center gap-1.5 text-sm font-semibold transition-colors"
            title="Export full registry to CSV"
          >
            <Download size={16} /> Export
          </button>
          {canCreate && (
            <button
              onClick={() => router.push("/settings/platform/entities/new")}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
            >
              <Plus size={16} /> New Entity
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Total</span>
          <span className="text-2xl font-bold">{totalCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1">
            <FileBox size={12} className="text-slate-500" /> Draft
          </span>
          <span className="text-2xl font-bold">{draftCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider flex items-center gap-1">
            <FileCheck size={12} /> Published
          </span>
          <span className="text-2xl font-bold">{publishedCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-orange-600 mb-1 uppercase tracking-wider flex items-center gap-1">
            <Archive size={12} /> Archived
          </span>
          <span className="text-2xl font-bold">{archivedCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider flex items-center gap-1">
            <Database size={12} /> System
          </span>
          <span className="text-2xl font-bold">{systemCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-purple-600 mb-1 uppercase tracking-wider flex items-center gap-1">
            <Building size={12} /> Custom
          </span>
          <span className="text-2xl font-bold">{customCount}</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center">
          <span className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider flex items-center gap-1">
            <MonitorSmartphone size={12} /> In Nav
          </span>
          <span className="text-2xl font-bold">{navCount}</span>
        </div>
      </div>

      {/* Grid Toolbar & Bulk Actions */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm relative z-30">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative w-full max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search registry..."
              value={quickFilterText}
              onChange={(e) => {
                setQuickFilterText(e.target.value);
                gridRef.current?.api.setGridOption("quickFilterText", e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="VALIDATED">Validated</option>
            <option value="PUBLISHED">Published</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="SYSTEM">System</option>
            <option value="CUSTOM">Custom</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
          >
            <option value="ALL">All Active</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground mr-2">
              {selectedRows.length} selected
            </span>
            {canUpdate && selectedRows.length === 1 && (
              <button
                onClick={() => handleEditClick(selectedRows[0])}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-muted/50"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            {canUpdate && (
              <button
                onClick={handleBulkPublish}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-50 text-emerald-600 border-emerald-200"
              >
                <Rocket size={14} /> Publish
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-orange-50 text-orange-600 border-orange-200"
              >
                <Archive size={14} /> Archive
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleBulkRestore}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-50 text-emerald-600 border-emerald-200"
              >
                <ArchiveRestore size={14} /> Restore
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-rose-50 text-rose-600 border-rose-200"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* AG Grid */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-[600px] w-full relative z-0 ag-theme-alpine">
        {isLoading ? (
          <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-muted-foreground">Loading registry...</p>
            </div>
          </div>
        ) : null}
        
        <AgGridReact
          ref={gridRef}
          rowData={filteredEntities}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true, filter: true }}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 50, 100]}
          animateRows={true}
          enableRangeSelection={true}
          rowDragManaged={true}
          headerHeight={48}
          rowHeight={40}
          noRowsOverlayComponent={noRowsOverlayComponent}
        />
      </div>

      {entityToPublish && (
        <PublishDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          entityId={entityToPublish.id}
          entityName={entityToPublish.name}
          onSuccess={() => {
            setEntityToPublish(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
