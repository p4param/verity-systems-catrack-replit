"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  LayoutGrid,
  Rows3,
  Columns3,
  FormInput,
  GripVertical,
  MoveUp,
  MoveDown,
} from "lucide-react";
import {
  useCreateLayout,
  useUpdateLayout,
} from "@/modules/platform/configuration/hooks/use-layouts";
import { useFields } from "@/modules/platform/configuration/hooks/use-fields";
import type {
  LayoutRoot,
  LayoutTab,
  LayoutSection,
  LayoutGroup,
  LayoutRow,
  LayoutColumn,
  LayoutFieldPlacement,
} from "@/modules/platform/configuration/validations/layout-validation";

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType = "tab" | "section" | "group" | "row" | "column" | "placement";

interface TreeNode {
  id: string;
  type: NodeType;
  name: string;
  data: any;
  children: TreeNode[];
  path: number[];
}

interface LayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  layoutId: string | null;
  initialData: any | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createNode(type: NodeType, name: string, extra: any = {}): any {
  return {
    id: crypto.randomUUID(),
    code: name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, ""),
    name,
    description: null,
    displayOrder: 0,
    visible: true,
    metadata: {},
    ...extra,
  };
}

function createDefaultTab(): LayoutTab {
  return {
    ...createNode("tab", "General"),
    title: "General",
    icon: null,
    sections: [],
  } as LayoutTab;
}

function createDefaultSection(): LayoutSection {
  return {
    ...createNode("section", "Details"),
    title: "Details",
    icon: null,
    collapsible: false,
    initiallyExpanded: true,
    groups: [],
  } as LayoutSection;
}

function createDefaultGroup(): LayoutGroup {
  return {
    ...createNode("group", "Fields"),
    title: null,
    icon: null,
    rows: [],
  } as LayoutGroup;
}

function createDefaultRow(): LayoutRow {
  return {
    ...createNode("row", "Row"),
    columns: [],
  } as LayoutRow;
}

function createDefaultColumn(): LayoutColumn {
  return {
    ...createNode("column", "Column"),
    span: { xs: 12, md: 6 },
    placements: [],
  } as LayoutColumn;
}

function createDefaultPlacement(fieldId: string, fieldLabel: string): LayoutFieldPlacement {
  return {
    ...createNode("placement", fieldLabel),
    fieldId,
    span: { xs: 12, md: 6 },
    labelPosition: undefined,
    requiredOverride: null,
    readOnlyOverride: null,
    hiddenOverride: null,
    placeholder: null,
    helpText: null,
    width: null,
    cssClass: null,
    visibilityExpression: null,
    enableExpression: null,
    defaultValueExpression: null,
  } as LayoutFieldPlacement;
}

// Build tree from layout root
function buildTree(layout: LayoutRoot): TreeNode[] {
  return (layout.tabs || []).map((tab, ti) => ({
    id: tab.id,
    type: "tab" as NodeType,
    name: tab.title || tab.name || "Tab",
    data: tab,
    path: [ti],
    children: (tab.sections || []).map((section, si) => ({
      id: section.id,
      type: "section" as NodeType,
      name: section.title || section.name || "Section",
      data: section,
      path: [ti, si],
      children: (section.groups || []).map((group, gi) => ({
        id: group.id,
        type: "group" as NodeType,
        name: group.title || group.name || "Group",
        data: group,
        path: [ti, si, gi],
        children: (group.rows || []).map((row, ri) => ({
          id: row.id,
          type: "row" as NodeType,
          name: row.name || "Row",
          data: row,
          path: [ti, si, gi, ri],
          children: (row.columns || []).map((col, ci) => ({
            id: col.id,
            type: "column" as NodeType,
            name: col.name || "Column",
            data: col,
            path: [ti, si, gi, ri, ci],
            children: (col.placements || []).map((pl, pi) => ({
              id: pl.id,
              type: "placement" as NodeType,
              name: pl.name || "Field",
              data: pl,
              path: [ti, si, gi, ri, ci, pi],
              children: [],
            })),
          })),
        })),
      })),
    })),
  }));
}

const nodeIcons: Record<NodeType, React.ReactNode> = {
  tab: <Layers size={14} className="text-blue-500" />,
  section: <LayoutGrid size={14} className="text-purple-500" />,
  group: <Rows3 size={14} className="text-amber-500" />,
  row: <Rows3 size={14} className="text-emerald-500" />,
  column: <Columns3 size={14} className="text-cyan-500" />,
  placement: <FormInput size={14} className="text-rose-500" />,
};

const nodeLabels: Record<NodeType, string> = {
  tab: "Tab",
  section: "Section",
  group: "Group",
  row: "Row",
  column: "Column",
  placement: "Field",
};

// ─── Tree Node Component ─────────────────────────────────────────────────────

function TreeNodeItem({
  node,
  selectedId,
  onSelect,
  expanded,
  onToggle,
  depth,
}: {
  node: TreeNode;
  selectedId: string | null;
  onSelect: (node: TreeNode) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer text-sm transition-colors ${
          isSelected
            ? "bg-primary/10 text-primary font-semibold"
            : "hover:bg-muted/50 text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 hover:bg-muted rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {nodeIcons[node.type]}
        <span className="truncate">{node.name}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {nodeLabels[node.type]}
        </span>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <TreeNodeItem
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// ─── Main Dialog ─────────────────────────────────────────────────────────────

export function LayoutDialog({
  open,
  onOpenChange,
  entityId,
  layoutId,
  initialData,
}: LayoutDialogProps) {
  const isNew = !layoutId;
  const createMutation = useCreateLayout(entityId);
  const updateMutation = useUpdateLayout(entityId);
  const { data: fields = [] } = useFields(entityId);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Form State ──────────────────────────────────────────────────────

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      code: "",
      name: "",
      description: "",
      layoutType: "FORM",
      isDefault: false,
    },
  });

  const [layout, setLayout] = useState<LayoutRoot>({
    layoutVersion: "1.0",
    responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
    tabs: [],
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("structure");

  // ─── Initialize ────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          code: initialData.code || "",
          name: initialData.name || "",
          description: initialData.description || "",
          layoutType: initialData.layoutType || "FORM",
          isDefault: initialData.isDefault || false,
        });
        const layoutData = initialData.layout || {
          layoutVersion: "1.0",
          responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
          tabs: [],
        };
        setLayout(layoutData);
        // Expand all nodes initially
        const allIds = new Set<string>();
        function collectIds(tabs: any[]) {
          for (const tab of tabs || []) {
            allIds.add(tab.id);
            for (const sec of tab.sections || []) {
              allIds.add(sec.id);
              for (const grp of sec.groups || []) {
                allIds.add(grp.id);
                for (const row of grp.rows || []) {
                  allIds.add(row.id);
                  for (const col of row.columns || []) {
                    allIds.add(col.id);
                  }
                }
              }
            }
          }
        }
        collectIds(layoutData.tabs);
        setExpandedNodes(allIds);
        setActiveTab("structure");
      } else {
        reset({
          code: "",
          name: "",
          description: "",
          layoutType: "FORM",
          isDefault: false,
        });
        setLayout({
          layoutVersion: "1.0",
          responsiveColumns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 3 },
          tabs: [],
        });
        setExpandedNodes(new Set());
        setActiveTab("structure");
      }
      setSelectedNodeId(null);
    }
  }, [open, initialData, reset]);

  // Auto-generate code from name
  const nameValue = watch("name");
  useEffect(() => {
    if (isNew && nameValue) {
      const generated = nameValue
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 50);
      if (generated.length >= 2) {
        setValue("code", generated);
      }
    }
  }, [nameValue, isNew, setValue]);

  // ─── Tree ──────────────────────────────────────────────────────────

  const tree = useMemo(() => buildTree(layout), [layout]);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    function find(nodes: TreeNode[]): TreeNode | null {
      for (const n of nodes) {
        if (n.id === selectedNodeId) return n;
        const found = find(n.children);
        if (found) return found;
      }
      return null;
    }
    return find(tree);
  }, [selectedNodeId, tree]);

  // ─── Layout Mutations ──────────────────────────────────────────────

  const addTab = () => {
    const tab = createDefaultTab();
    tab.displayOrder = layout.tabs.length;
    setLayout((prev) => ({ ...prev, tabs: [...prev.tabs, tab] }));
    setExpandedNodes((prev) => new Set([...prev, tab.id]));
    setSelectedNodeId(tab.id);
  };

  const addChild = (parentNode: TreeNode) => {
    setLayout((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayoutRoot;
      const path = parentNode.path;

      if (parentNode.type === "tab") {
        const section = createDefaultSection();
        section.displayOrder = next.tabs[path[0]].sections.length;
        next.tabs[path[0]].sections.push(section);
        setExpandedNodes((p) => new Set([...p, section.id]));
        setSelectedNodeId(section.id);
      } else if (parentNode.type === "section") {
        const group = createDefaultGroup();
        group.displayOrder = next.tabs[path[0]].sections[path[1]].groups.length;
        next.tabs[path[0]].sections[path[1]].groups.push(group);
        setExpandedNodes((p) => new Set([...p, group.id]));
        setSelectedNodeId(group.id);
      } else if (parentNode.type === "group") {
        const row = createDefaultRow();
        row.displayOrder = next.tabs[path[0]].sections[path[1]].groups[path[2]].rows.length;
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows.push(row);
        setExpandedNodes((p) => new Set([...p, row.id]));
        setSelectedNodeId(row.id);
      } else if (parentNode.type === "row") {
        const column = createDefaultColumn();
        column.displayOrder =
          next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns.length;
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns.push(column);
        setExpandedNodes((p) => new Set([...p, column.id]));
        setSelectedNodeId(column.id);
      }

      return next;
    });
  };

  const addFieldToColumn = (parentNode: TreeNode, fieldId: string) => {
    const field = fields.find((f: any) => f.id === fieldId);
    if (!field) return;

    setLayout((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayoutRoot;
      const path = parentNode.path;
      const placement = createDefaultPlacement(fieldId, field.label);
      placement.displayOrder =
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns[path[4]]
          .placements.length;
      next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns[
        path[4]
      ].placements.push(placement);
      setSelectedNodeId(placement.id);
      return next;
    });
  };

  const deleteNode = (node: TreeNode) => {
    setLayout((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayoutRoot;
      const path = node.path;

      if (node.type === "tab") {
        next.tabs.splice(path[0], 1);
      } else if (node.type === "section") {
        next.tabs[path[0]].sections.splice(path[1], 1);
      } else if (node.type === "group") {
        next.tabs[path[0]].sections[path[1]].groups.splice(path[2], 1);
      } else if (node.type === "row") {
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows.splice(path[3], 1);
      } else if (node.type === "column") {
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns.splice(
          path[4],
          1
        );
      } else if (node.type === "placement") {
        next.tabs[path[0]].sections[path[1]].groups[path[2]].rows[path[3]].columns[
          path[4]
        ].placements.splice(path[5], 1);
      }

      return next;
    });
    setSelectedNodeId(null);
  };

  const updateNodeProperty = (nodeId: string, key: string, value: any) => {
    setLayout((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as LayoutRoot;

      function update(tabs: any[]) {
        for (const tab of tabs) {
          if (tab.id === nodeId) { tab[key] = value; return true; }
          for (const sec of tab.sections || []) {
            if (sec.id === nodeId) { sec[key] = value; return true; }
            for (const grp of sec.groups || []) {
              if (grp.id === nodeId) { grp[key] = value; return true; }
              for (const row of grp.rows || []) {
                if (row.id === nodeId) { row[key] = value; return true; }
                for (const col of row.columns || []) {
                  if (col.id === nodeId) { col[key] = value; return true; }
                  for (const pl of col.placements || []) {
                    if (pl.id === nodeId) { pl[key] = value; return true; }
                  }
                }
              }
            }
          }
        }
        return false;
      }

      update(next.tabs);
      return next;
    });
  };

  // ─── Submit ────────────────────────────────────────────────────────

  const onSubmit = async (formData: any) => {
    try {
      const payload = {
        ...formData,
        layout,
      };

      if (isNew) {
        await createMutation.mutateAsync(payload);
        toast.success("Layout created successfully");
      } else {
        await updateMutation.mutateAsync({ id: layoutId!, data: payload });
        toast.success("Layout updated successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save layout");
    }
  };

  // ─── Field lookup ──────────────────────────────────────────────────

  const getFieldLabel = (fieldId: string) => {
    const field = fields.find((f: any) => f.id === fieldId);
    return field ? field.label : fieldId;
  };

  // Collect all placed field IDs
  const placedFieldIds = useMemo(() => {
    const ids = new Set<string>();
    function collect(tabs: any[]) {
      for (const tab of tabs || []) {
        for (const sec of tab.sections || []) {
          for (const grp of sec.groups || []) {
            for (const row of grp.rows || []) {
              for (const col of row.columns || []) {
                for (const pl of col.placements || []) {
                  ids.add(pl.fieldId);
                }
              }
            }
          }
        }
      }
    }
    collect(layout.tabs);
    return ids;
  }, [layout]);

  const unplacedFields = useMemo(
    () => fields.filter((f: any) => !placedFieldIds.has(f.id)),
    [fields, placedFieldIds]
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>{isNew ? "Create Layout View" : "Edit Layout View"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col overflow-hidden"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.target as HTMLElement).tagName !== "BUTTON"
            ) {
              e.preventDefault();
            }
          }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 shrink-0">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="structure">Structure</TabsTrigger>
            </TabsList>

            {/* ─── General Tab ────────────────────────────────────── */}
            <TabsContent value="general" className="flex-1 overflow-auto p-6 m-0">
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Layout Name *
                  </label>
                  <input
                    {...register("name")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    placeholder="e.g. Main Form"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Layout Code *
                  </label>
                  <input
                    {...register("code")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                    placeholder="e.g. MAIN_FORM"
                    readOnly={!isNew}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm h-20"
                    placeholder="Layout description..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Layout Type *
                  </label>
                  <select
                    {...register("layoutType")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  >
                    <option value="FORM">Form</option>
                    <option value="DETAIL">Detail</option>
                    <option value="QUICK_CREATE">Quick Create</option>
                    <option value="WIZARD">Wizard</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="PRINT">Print</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input type="checkbox" {...register("isDefault")} id="layoutIsDefault" className="w-4 h-4" />
                  <label htmlFor="layoutIsDefault" className="text-sm font-medium">
                    Set as Default Layout
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* ─── Structure Tab ───────────────────────────────────── */}
            <TabsContent value="structure" className="flex-1 overflow-hidden m-0">
              <div className="flex h-full">
                {/* Tree Panel */}
                <div className="w-[320px] border-r border-border flex flex-col shrink-0">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">
                      Layout Tree
                    </span>
                    <button
                      type="button"
                      onClick={addTab}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      <Plus size={12} /> Add Tab
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    {tree.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Layers className="w-8 h-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No tabs yet. Click "Add Tab" to begin.
                        </p>
                      </div>
                    ) : (
                      tree.map((node) => (
                        <TreeNodeItem
                          key={node.id}
                          node={node}
                          selectedId={selectedNodeId}
                          onSelect={(n) => setSelectedNodeId(n.id)}
                          expanded={expandedNodes}
                          onToggle={toggleNode}
                          depth={0}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Properties Panel */}
                <div className="flex-1 overflow-auto p-4">
                  {selectedNode ? (
                    <NodePropertiesPanel
                      node={selectedNode}
                      fields={fields}
                      unplacedFields={unplacedFields}
                      onUpdate={updateNodeProperty}
                      onAddChild={addChild}
                      onAddField={addFieldToColumn}
                      onDelete={deleteNode}
                      getFieldLabel={getFieldLabel}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Select a node from the tree to view its properties.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-4 pt-4 border-t border-border bg-muted/10 mt-auto shrink-0">
            <div className="flex justify-between w-full">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  {layout.tabs.length} tab(s) •{" "}
                  {layout.tabs.reduce((sum, t) => sum + t.sections.length, 0)} section(s) •{" "}
                  {placedFieldIds.size} field(s) placed
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isNew ? "Create Layout" : "Save Changes"}
                </button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Node Properties Panel ───────────────────────────────────────────────────

function NodePropertiesPanel({
  node,
  fields,
  unplacedFields,
  onUpdate,
  onAddChild,
  onAddField,
  onDelete,
  getFieldLabel,
}: {
  node: TreeNode;
  fields: any[];
  unplacedFields: any[];
  onUpdate: (nodeId: string, key: string, value: any) => void;
  onAddChild: (parentNode: TreeNode) => void;
  onAddField: (parentNode: TreeNode, fieldId: string) => void;
  onDelete: (node: TreeNode) => void;
  getFieldLabel: (fieldId: string) => string;
}) {
  const childLabel: Record<string, string> = {
    tab: "Section",
    section: "Group",
    group: "Row",
    row: "Column",
    column: "Field",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nodeIcons[node.type]}
          <h4 className="text-sm font-bold">
            {nodeLabels[node.type]}: {node.name}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => onDelete(node)}
          className="text-xs flex items-center gap-1 text-rose-500 hover:bg-rose-500/10 px-2 py-1 rounded"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>

      {/* Common Properties */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Name</label>
          <input
            value={node.data.name || ""}
            onChange={(e) => {
              onUpdate(node.id, "name", e.target.value);
              if (node.type === "tab" || node.type === "section" || node.type === "group") {
                onUpdate(node.id, "title", e.target.value);
              }
            }}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Code</label>
          <input
            value={node.data.code || ""}
            onChange={(e) => onUpdate(node.id, "code", e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-muted-foreground mb-1">Description</label>
          <input
            value={node.data.description || ""}
            onChange={(e) => onUpdate(node.id, "description", e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Display Order</label>
          <input
            type="number"
            value={node.data.displayOrder ?? 0}
            onChange={(e) =>
              onUpdate(node.id, "displayOrder", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <input
            type="checkbox"
            checked={node.data.visible !== false}
            onChange={(e) => onUpdate(node.id, "visible", e.target.checked)}
            id={`visible-${node.id}`}
            className="w-4 h-4"
          />
          <label htmlFor={`visible-${node.id}`} className="text-sm">
            Visible
          </label>
        </div>
      </div>

      {/* Type-specific Properties */}
      {node.type === "section" && (
        <div className="border-t border-border pt-4 space-y-3">
          <h5 className="text-xs font-bold text-muted-foreground uppercase">Section Properties</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Icon</label>
              <input
                value={node.data.icon || ""}
                onChange={(e) => onUpdate(node.id, "icon", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                placeholder="e.g. Info"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                checked={node.data.collapsible || false}
                onChange={(e) => onUpdate(node.id, "collapsible", e.target.checked)}
                id={`collapsible-${node.id}`}
                className="w-4 h-4"
              />
              <label htmlFor={`collapsible-${node.id}`} className="text-sm">
                Collapsible
              </label>
            </div>
            {node.data.collapsible && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={node.data.initiallyExpanded !== false}
                  onChange={(e) => onUpdate(node.id, "initiallyExpanded", e.target.checked)}
                  id={`expanded-${node.id}`}
                  className="w-4 h-4"
                />
                <label htmlFor={`expanded-${node.id}`} className="text-sm">
                  Initially Expanded
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {(node.type === "column" || node.type === "placement") && (
        <div className="border-t border-border pt-4 space-y-3">
          <h5 className="text-xs font-bold text-muted-foreground uppercase">Responsive Span</h5>
          <div className="grid grid-cols-5 gap-2">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((bp) => (
              <div key={bp}>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">
                  {bp}
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={node.data.span?.[bp] ?? (bp === "xs" ? 12 : "")}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                    onUpdate(node.id, "span", {
                      ...(node.data.span || { xs: 12 }),
                      [bp]: val,
                    });
                  }}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center"
                  placeholder="–"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {node.type === "placement" && (
        <div className="border-t border-border pt-4 space-y-3">
          <h5 className="text-xs font-bold text-muted-foreground uppercase">Field</h5>
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm font-medium">{getFieldLabel(node.data.fieldId)}</p>
            <p className="text-xs text-muted-foreground font-mono">{node.data.fieldId}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Label Position
              </label>
              <select
                value={node.data.labelPosition || ""}
                onChange={(e) =>
                  onUpdate(node.id, "labelPosition", e.target.value || undefined)
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="">Default</option>
                <option value="TOP">Top</option>
                <option value="LEFT">Left</option>
                <option value="RIGHT">Right</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Placeholder
              </label>
              <input
                value={node.data.placeholder || ""}
                onChange={(e) => onUpdate(node.id, "placeholder", e.target.value || null)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                Help Text
              </label>
              <input
                value={node.data.helpText || ""}
                onChange={(e) => onUpdate(node.id, "helpText", e.target.value || null)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">
                CSS Class
              </label>
              <input
                value={node.data.cssClass || ""}
                onChange={(e) => onUpdate(node.id, "cssClass", e.target.value || null)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
              />
            </div>
          </div>
          <h5 className="text-xs font-bold text-muted-foreground uppercase pt-2">Overrides</h5>
          <div className="flex gap-6">
            {(
              [
                ["requiredOverride", "Required"],
                ["readOnlyOverride", "Read Only"],
                ["hiddenOverride", "Hidden"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <select
                  value={
                    node.data[key] === true
                      ? "true"
                      : node.data[key] === false
                        ? "false"
                        : ""
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    onUpdate(node.id, key, v === "" ? null : v === "true");
                  }}
                  className="px-2 py-1 bg-background border border-border rounded text-xs"
                >
                  <option value="">Inherit</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Child */}
      {childLabel[node.type] && (
        <div className="border-t border-border pt-4">
          {node.type === "column" ? (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-muted-foreground uppercase">Add Field</h5>
              {unplacedFields.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {unplacedFields.map((f: any) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onAddField(node, f.id)}
                      className="text-left px-3 py-2 border border-border rounded-lg hover:bg-primary/5 hover:border-primary/30 text-sm transition-colors"
                    >
                      <p className="font-medium">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{f.code}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">All fields have been placed.</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddChild(node)}
              className="text-xs flex items-center gap-1 text-primary hover:underline"
            >
              <Plus size={12} /> Add {childLabel[node.type]}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
