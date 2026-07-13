"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ColDef, GridReadyEvent, ModuleRegistry, ValidationModule } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

import { RuntimeManifest } from "@/modules/platform/runtime/services/manifest-generator";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, MoreHorizontal, Eye, Edit, Copy, Trash } from "lucide-react";
import { useDeleteRecord } from "@/modules/platform/runtime/hooks/use-records";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

interface DynamicGridProps {
  manifest: RuntimeManifest;
  records: any[];
  isLoading: boolean;
}

export function DynamicGrid({ manifest, records, isLoading }: DynamicGridProps) {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteRecord(manifest.module, manifest.entity);

  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  const onExportClick = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv();
  }, []);

  const onRefreshClick = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["runtime", manifest.module, manifest.entity] });
  }, [queryClient, manifest.module, manifest.entity]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteMutation.mutateAsync(recordToDelete);
      toast.success("Record deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setRecordToDelete(null);
    }
  };

  const ActionsCell = (params: any) => {
    const id = params.data.id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`${manifest.route}/${id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`${manifest.route}/${id}?edit=true`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => setRecordToDelete(id)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columnDefs = useMemo(() => {
    const dataViews = manifest.presentation?.dataViews || [];
    const view = dataViews.find(v => v.code === manifest.presentation?.defaultDataViewCode) || dataViews[0] || {};
    const metadata = view?.metadata || {};
    const columnsConfig = metadata.columns || [];

    let defs: ColDef[] = [];

    if (columnsConfig && columnsConfig.length > 0) {
      const sortedColumns = [...columnsConfig].sort((a, b) => a.displayOrder - b.displayOrder);
      defs = sortedColumns.map((col: any) => {
        const field = manifest.fields.find(f => f.code === col.field);
        if (!field) return null;
        
        const isLookup = field.uiControl === "LOOKUP" || field.dataSource === "LOOKUP" || field.dataSource === "LOOKUP_ENTITY" || field.dataSource === "LOOKUP_VIEW";
        const colDef: ColDef = {
          field: isLookup ? `${col.field}_label` : col.field,
          headerName: col.header || field.label || col.field,
          sortable: col.sortable ?? field.sortable ?? true,
          filter: col.filterable ?? field.filterable ?? true,
          width: col.width,
          pinned: col.pinned && col.pinned !== "none" ? col.pinned : undefined,
          hide: col.visible === false,
        };
        
        if (field.dataType === "BOOLEAN") {
          colDef.valueFormatter = (params: any) => {
            if (params.value === true || params.value === "true" || params.value === "True") return "True";
            if (params.value === false || params.value === "false" || params.value === "False") return "False";
            return "";
          };
          // Ensure AG Grid text filter uses the formatted "True"/"False" string for case-insensitive matching
          colDef.filterParams = {
            valueFormatter: (params: any) => {
              if (params.value === true || params.value === "true" || params.value === "True") return "True";
              if (params.value === false || params.value === "false" || params.value === "False") return "False";
              return String(params.value || "");
            }
          };
        } else if (field.options && field.options.length > 0) {
          colDef.valueFormatter = (params: any) => {
             if (!params.value) return "";
             let val = params.value;
             if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
               try { val = JSON.parse(val); } catch (e) {}
             }
             if (Array.isArray(val)) {
               return val.map((v: any) => {
                 const option = field.options.find((o: any) => o.code === v || o.id === v);
                 return option ? option.label : v;
               }).join(", ");
             }
             const option = field.options.find((o: any) => o.code === params.value || o.id === params.value);
             return option ? option.label : params.value;
          };
        }
        
        return colDef;
      }).filter(Boolean) as ColDef[];
    } else {
      defs = manifest.fields.map(field => {
        const isLookup = field.uiControl === "LOOKUP" || field.dataSource === "LOOKUP" || field.dataSource === "LOOKUP_ENTITY" || field.dataSource === "LOOKUP_VIEW";
        const colDef: ColDef = {
          field: isLookup ? `${field.code}_label` : field.code,
          headerName: field.label,
          sortable: field.sortable,
          filter: field.filterable,
        };
        
        if (field.dataType === "BOOLEAN") {
          colDef.valueFormatter = (params: any) => {
            if (params.value === true || params.value === "true" || params.value === "True") return "True";
            if (params.value === false || params.value === "false" || params.value === "False") return "False";
            return "";
          };
          colDef.filterParams = {
            valueFormatter: (params: any) => {
              if (params.value === true || params.value === "true" || params.value === "True") return "True";
              if (params.value === false || params.value === "false" || params.value === "False") return "False";
              return String(params.value || "");
            }
          };
        } else if (field.options && field.options.length > 0) {
          colDef.valueFormatter = (params: any) => {
             if (!params.value) return "";
             let val = params.value;
             if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
               try { val = JSON.parse(val); } catch (e) {}
             }
             if (Array.isArray(val)) {
               return val.map((v: any) => {
                 const option = field.options.find((o: any) => o.code === v || o.id === v);
                 return option ? option.label : v;
               }).join(", ");
             }
             const option = field.options.find((o: any) => o.code === params.value || o.id === params.value);
             return option ? option.label : params.value;
          };
        }
        return colDef;
      });
    }

    defs.unshift({
      field: "recordNumber",
      headerName: "ID",
      sortable: true,
      filter: true,
      width: 140,
      headerCheckboxSelection: true,
      checkboxSelection: true,
      pinned: "left"
    });
    
    defs.push({
      headerName: "",
      field: "actions",
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCell,
      pinned: "right"
    });

    return defs;
  }, [manifest, router]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    const dataViews = manifest.presentation?.dataViews || [];
    const view = dataViews.find(v => v.code === manifest.presentation?.defaultDataViewCode) || dataViews[0] || {};
    const metadata = view?.metadata || {};
    
    // Apply Sort State
    if (metadata.sorting && metadata.sorting.length > 0) {
      const sortState = [...metadata.sorting].sort((a: any, b: any) => a.sequence - b.sequence).map((s: any) => ({
        colId: s.field,
        sort: (s.direction === 'DESC' ? 'desc' : 'asc') as 'asc' | 'desc'
      }));
      params.api.applyColumnState({
        state: sortState,
        defaultState: { sort: null }
      });
    }

    // Apply Filter State MVP
    if (metadata.filters?.conditions?.length > 0) {
      const filterModel: any = {};
      for (const cond of metadata.filters.conditions) {
        if (!cond.field || !cond.operator) continue;
        
        let type = "equals";
        switch (cond.operator) {
          case "equals": type = "equals"; break;
          case "notEquals": type = "notEqual"; break;
          case "contains": type = "contains"; break;
          case "notContains": type = "notContains"; break;
          case "startsWith": type = "startsWith"; break;
          case "endsWith": type = "endsWith"; break;
          case "greaterThan": type = "greaterThan"; break;
          case "lessThan": type = "lessThan"; break;
        }
        
        // AG Grid filter requires finding if it's text or number filter based on field
        // We'll default to text filter since all our primitive filters are text by default
        const field = manifest.fields.find(f => f.code === cond.field);
        const isLookup = field && (field.uiControl === "LOOKUP" || field.dataSource === "LOOKUP" || field.dataSource === "LOOKUP_ENTITY" || field.dataSource === "LOOKUP_VIEW");
        const filterColId = isLookup ? `${cond.field}_label` : cond.field;
        
        filterModel[filterColId] = {
          filterType: "text",
          type,
          filter: String(cond.value)
        };
      }
      params.api.setFilterModel(filterModel);
    }
  }, [manifest]);

  return (
    <div className="w-full flex flex-col h-[600px] gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={onRefreshClick} disabled={isLoading || deleteMutation.isPending}>
             <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
             Refresh
           </Button>
           <Button variant="outline" size="sm" onClick={onExportClick}>
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
        </div>
      </div>

      <div className="ag-theme-alpine flex-1 w-full">
        {isLoading && (!records || records.length === 0) ? (
          <div className="flex h-full items-center justify-center">Loading...</div>
        ) : (
          <AgGridReact
            ref={gridRef}
            rowData={records}
            columnDefs={columnDefs}
            pagination={true}
            paginationPageSize={25}
            animateRows={true}
            rowSelection={{ mode: 'multiRow' }}
            theme="legacy"
            onGridReady={onGridReady}
          />
        )}
      </div>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
