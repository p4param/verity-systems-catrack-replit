"use client";

import React, { useMemo, useRef, useCallback, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ColDef, GridReadyEvent, ModuleRegistry } from "ag-grid-community";
import { AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

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
    const view = manifest.views.find(v => v.code === manifest.defaultView) || manifest.views[0];
    const columnsConfig = view?.columns ? (Array.isArray(view.columns) ? view.columns : JSON.parse(view.columns as unknown as string)) : [];

    let defs: ColDef[] = [];

    if (columnsConfig && columnsConfig.length > 0) {
      defs = columnsConfig.map((col: any) => {
        const field = manifest.fields.find(f => f.code === col.field);
        const colDef: ColDef = {
          field: field?.uiControl === "LOOKUP" ? `${col.field}_label` : col.field,
          headerName: col.headerName || field?.label || col.field,
          sortable: col.sortable ?? field?.sortable ?? true,
          filter: col.filter ?? field?.filterable ?? true,
        };
        if (field?.options && field.options.length > 0) {
          colDef.valueFormatter = (params: any) => {
             if (!params.value) return "";
             const option = field.options.find((o: any) => o.code === params.value || o.id === params.value);
             return option ? option.label : params.value;
          };
        }
        
        return colDef;
      });
    } else {
      defs = manifest.fields.map(field => {
        const colDef: ColDef = {
          field: field.uiControl === "LOOKUP" ? `${field.code}_label` : field.code,
          headerName: field.label,
          sortable: field.sortable,
          filter: field.filterable,
        };
        
        if (field.options && field.options.length > 0) {
          colDef.valueFormatter = (params: any) => {
             if (!params.value) return "";
             const option = field.options.find((o: any) => o.code === params.value || o.id === params.value);
             return option ? option.label : params.value;
          };
        }
        return colDef;
      });
    }

    // Add standard ID column with Checkbox selection
    defs.unshift({
      field: "recordNumber",
      headerName: "ID",
      sortable: true,
      filter: true,
      width: 140,
      headerCheckboxSelection: true,
      checkboxSelection: true,
    });
    
    // Add Actions column
    defs.push({
      headerName: "",
      field: "actions",
      width: 70,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCell,
    });

    return defs;
  }, [manifest, router]);

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
