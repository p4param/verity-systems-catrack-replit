"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import {
  useNavigationTree,
  useNavigationProfiles,
  usePublishNavigation,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  useMoveNavigationItem,
  useNavigationVersions,
  useRestoreVersion,
  useHistoryLogs
} from "@/modules/platform/navigation/hooks/use-navigation-designer";
import { usePlatformModules } from "@/modules/platform/configuration/hooks/use-platform-modules";
import {
  FolderPlus,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Settings,
  Shield,
  Activity,
  CheckCircle,
  AlertTriangle,
  FolderLock,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Tablet,
  Globe,
  Globe2,
  RefreshCw,
  Save,
  Clock,
  History,
  FileCheck,
  Search,
  Eye,
  Sliders,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";

export default function NavigationDesignerPage() {
  const { user } = useAuth();
  
  // Queries
  const { data: tree = [], isLoading: loadingTree, refetch: refetchTree } = useNavigationTree();
  const { data: profiles = [], isLoading: loadingProfiles } = useNavigationProfiles();
  const { data: modules = [] } = usePlatformModules();
  const { data: versions = [], refetch: refetchVersions } = useNavigationVersions();
  const { data: historyLogs = [], refetch: refetchHistory } = useHistoryLogs();

  // Mutations
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();
  const moveItemMutation = useMoveNavigationItem();
  const publishMutation = usePublishNavigation();
  const restoreVersionMutation = useRestoreVersion();

  // Component States
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [nodeType, setNodeType] = useState<"GROUP" | "ITEM" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Modals state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Group Form state
  const [groupForm, setGroupForm] = useState({
    code: "",
    name: "",
    description: "",
    icon: "FolderLock",
    color: "slate",
    displayOrder: 0,
    isVisible: true,
    isCollapsedByDefault: false
  });

  // Item Form state
  const [itemForm, setItemForm] = useState({
    title: "",
    parentId: "",
    navigationGroupId: "",
    platformModuleId: "",
    entityId: "",
    route: "",
    icon: "Box",
    displayOrder: 0,
    menuType: "MODULE",
    target: "SAME_WINDOW",
    openInNewTab: false,
    visible: true,
    mobileVisible: false,
    customerPortalVisible: false,
    vendorPortalVisible: false,
    favoriteAllowed: true,
    searchable: true,
    metadata: "{}"
  });

  // Preview options
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile" | "customer" | "vendor">("desktop");
  const [showVersions, setShowVersions] = useState(false);

  // Load first profile by default
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  // Selected Group details for Right panel
  const handleGroupSelect = (group: any) => {
    setSelectedNode(group);
    setNodeType("GROUP");
    setGroupForm({
      code: group.code,
      name: group.name,
      description: group.description || "",
      icon: group.icon || "FolderLock",
      color: group.color || "slate",
      displayOrder: group.displayOrder,
      isVisible: group.isVisible !== false,
      isCollapsedByDefault: group.isCollapsedByDefault === true
    });
  };

  // Selected Item details for Right panel
  const handleItemSelect = (item: any) => {
    setSelectedNode(item);
    setNodeType("ITEM");
    setItemForm({
      title: item.title,
      parentId: item.parentId || "",
      navigationGroupId: item.navigationGroupId || "",
      platformModuleId: item.platformModuleId || "",
      entityId: item.entityId || "",
      route: item.route || "",
      icon: item.icon || "Box",
      displayOrder: item.displayOrder,
      menuType: item.menuType || "MODULE",
      target: item.target || "SAME_WINDOW",
      openInNewTab: item.openInNewTab === true,
      visible: item.visible !== false,
      mobileVisible: item.mobileVisible === true,
      customerPortalVisible: item.customerPortalVisible === true,
      vendorPortalVisible: item.vendorPortalVisible === true,
      favoriteAllowed: item.favoriteAllowed !== false,
      searchable: item.searchable !== false,
      metadata: typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata || {})
    });
  };

  // Check diagnostics validation list
  const diagnostics = useMemo(() => {
    const anomalies: any[] = [];
    const routesSet = new Set<string>();
    const namesSet = new Set<string>();

    tree.forEach((group: any) => {
      group.items.forEach((item: any) => {
        // 1. Duplicate Routes
        if (item.route) {
          if (routesSet.has(item.route)) {
            anomalies.push({
              type: "DUPLICATE_ROUTE",
              severity: "WARNING",
              message: `Duplicate route path mapping "${item.route}" on item "${item.title}".`
            });
          } else {
            routesSet.add(item.route);
          }
        }

        // 2. Missing Icons
        if (!item.icon) {
          anomalies.push({
            type: "INVALID_ICON",
            severity: "WARNING",
            message: `Menu item "${item.title}" lacks a standard display icon.`
          });
        }

        // 3. Broken references check
        if (item.platformModuleId) {
          const modExists = modules.some((m: any) => m.id === item.platformModuleId);
          if (!modExists) {
            anomalies.push({
              type: "BROKEN_MODULE",
              severity: "ERROR",
              message: `Menu item "${item.title}" references a missing platform module.`
            });
          }
        }
      });
    });

    return {
      isValid: !anomalies.some(a => a.severity === "ERROR"),
      anomalies
    };
  }, [tree, modules]);

  // Handle visual canvas group reordering & items movements
  const handleIndentItem = async (item: any) => {
    // Make selected item a child of the previous sibling
    const siblings = tree.flatMap((g: any) => g.items).filter((i: any) => i.navigationGroupId === item.navigationGroupId && !i.parentId);
    const index = siblings.findIndex((i: any) => i.id === item.id);
    if (index > 0) {
      const prevSibling = siblings[index - 1];
      try {
        await moveItemMutation.mutateAsync({
          itemId: item.id,
          parentId: prevSibling.id,
          displayOrder: 0,
          tenantId: user?.tenantId || 1,
          actorUserId: user?.id || 1
        });
        toast.success(`Indented item "${item.title}" under "${prevSibling.title}"`);
        refetchTree();
      } catch (err: any) {
        toast.error("Failed to indent item");
      }
    }
  };

  const handleOutdentItem = async (item: any) => {
    if (!item.parentId) return;
    try {
      const parentNode = tree.flatMap((g: any) => g.items).find((i: any) => i.id === item.parentId);
      await moveItemMutation.mutateAsync({
        itemId: item.id,
        parentId: null,
        displayOrder: parentNode ? parentNode.displayOrder + 1 : 0,
        tenantId: user?.tenantId || 1,
        actorUserId: user?.id || 1
      });
      toast.success(`Outdented item "${item.title}" to root level`);
      refetchTree();
    } catch (err: any) {
      toast.error("Failed to outdent item");
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await updateGroupMutation.mutateAsync({
          id: editingGroup.id,
          data: groupForm,
          tenantId: user?.tenantId || 1,
          actorUserId: user?.id || 1
        });
        toast.success("Group settings updated successfully");
      } else {
        await createGroupMutation.mutateAsync({
          data: groupForm,
          tenantId: user?.tenantId || 1,
          actorUserId: user?.id || 1
        });
        toast.success("Group created successfully");
      }
      setGroupModalOpen(false);
      setEditingGroup(null);
      refetchTree();
    } catch (err: any) {
      toast.error(err.message || "Failed to save group details");
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...itemForm,
        metadata: JSON.parse(itemForm.metadata || "{}")
      };

      if (editingItem) {
        await updateItemMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
          tenantId: user?.tenantId || 1,
          actorUserId: user?.id || 1
        });
        toast.success("Item settings updated successfully");
      } else {
        await createItemMutation.mutateAsync({
          data: payload,
          tenantId: user?.tenantId || 1,
          actorUserId: user?.id || 1
        });
        toast.success("Item created successfully");
      }
      setItemModalOpen(false);
      setEditingItem(null);
      setShowIconPicker(false);
      setIconSearch("");
      refetchTree();
    } catch (err: any) {
      toast.error(err.message || "Failed to save item details");
    }
  };

  const handlePublish = async () => {
    if (!selectedProfileId) return;
    try {
      await publishMutation.mutateAsync({
        profileId: selectedProfileId,
        tenantId: user?.tenantId || 1,
        actorUserId: user?.id || 1
      });
      toast.success("Navigation cache published successfully!");
      refetchVersions();
      refetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Publish configuration failed");
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore this configuration version snapshot?")) return;
    try {
      await restoreVersionMutation.mutateAsync({
        versionId,
        tenantId: user?.tenantId || 1,
        actorUserId: user?.id || 1
      });
      toast.success("Restored layout structure version snapshot!");
      refetchTree();
    } catch (err: any) {
      toast.error("Failed to restore layout");
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-border gap-6 pb-2">
        <Link href="/settings/platform/modules" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Platform Modules
        </Link>
        <Link href="/settings/platform/runtime" className="border-b-2 border-transparent pb-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
          Runtime Engine
        </Link>
        <Link href="/settings/platform/navigation" className="border-b-2 border-primary pb-2 text-sm font-bold text-foreground transition-all">
          Navigation Designer
        </Link>
      </div>
      {/* Title */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Sliders size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Navigation Designer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customize dynamic groups and nested menus. Generate dynamic permission sidebars from metadata.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchTree()}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={() => { setEditingGroup(null); setGroupModalOpen(true); }}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-1.5"
          >
            <FolderPlus size={16} /> Add Group
          </button>

          <button
            onClick={() => { setEditingItem(null); setItemModalOpen(true); }}
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Item
          </button>

          <button
            onClick={handlePublish}
            disabled={!diagnostics.isValid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
          >
            <CheckCircle size={16} /> Publish Navigation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Tree Workspace & Visual Canvas */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Main Visual Layout Canvas */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Dynamic Layout Structure</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Indent and outdent items, reorder modules, and build nested menu trees visually.
                </p>
              </div>

              {/* Profile select option */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Layout Profile:</span>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {tree.map((group: any) => {
                const isCollapsed = collapsedGroups[group.id];
                return (
                  <div key={group.id} className="border border-border rounded-xl bg-background overflow-hidden">
                    {/* Group header */}
                    <div
                      onClick={() => handleGroupSelect(group)}
                      className={`p-3 bg-muted/20 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-all ${
                        selectedNode?.id === group.id ? "border-l-4 border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(group.id); }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                          {group.name} ({group.items.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setGroupModalOpen(true); }}
                          className="p-1 text-slate-400 hover:text-foreground"
                          title="Edit Group Settings"
                        >
                          <Settings size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Group Items list */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2">
                        {group.items.length === 0 && (
                          <p className="text-xs text-slate-400 p-2 italic">No items inside group container.</p>
                        )}
                        {group.items.map((item: any) => {
                          const hasChildren = item.children && item.children.length > 0;
                          return (
                            <div key={item.id} className="space-y-1.5">
                              {/* Root Item */}
                              <div
                                onClick={() => handleItemSelect(item)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border bg-background transition-all hover:shadow-sm ${
                                  selectedNode?.id === item.id ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400"><GripVertical size={16} /></span>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-sm text-foreground">{item.title}</span>
                                      <span className="font-mono text-xxs bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded">
                                        {item.menuType}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.route || "—"}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleIndentItem(item)}
                                    className="p-1 hover:bg-muted rounded text-slate-400"
                                    title="Indent under previous sibling"
                                  >
                                    <ArrowRight size={14} />
                                  </button>
                                  <button
                                    onClick={() => { setEditingItem(item); setItemModalOpen(true); }}
                                    className="p-1 hover:bg-muted rounded text-slate-400"
                                    title="Edit settings"
                                  >
                                    <Settings size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Nested Sub-items (Level 1 children) */}
                              {item.children?.map((child: any) => (
                                <div
                                  key={child.id}
                                  onClick={() => handleItemSelect(child)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border bg-background ml-8 transition-all hover:shadow-sm ${
                                    selectedNode?.id === child.id ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-slate-400"><GripVertical size={16} /></span>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-foreground">{child.title}</span>
                                        <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded">
                                          {child.menuType}
                                        </span>
                                      </div>
                                      <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{child.route || "—"}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOutdentItem(child)}
                                      className="p-1 hover:bg-muted rounded text-slate-400"
                                      title="Outdent to root level"
                                    >
                                      <ArrowLeft size={14} />
                                    </button>
                                    <button
                                      onClick={() => { setEditingItem(child); setItemModalOpen(true); }}
                                      className="p-1 hover:bg-muted rounded text-slate-400"
                                      title="Edit settings"
                                    >
                                      <Settings size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Device Previews Modes Panel */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Interactive Screen Preview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Check high-fidelity layouts simulations.</p>
              </div>

              {/* device selector */}
              <div className="flex bg-muted/30 border border-border rounded-xl p-1 gap-1">
                {[
                  { id: "desktop", name: "Desktop", icon: Sliders },
                  { id: "tablet", name: "Tablet", icon: Tablet },
                  { id: "mobile", name: "Mobile", icon: Smartphone },
                  { id: "customer", name: "Customer Portal", icon: Globe },
                  { id: "vendor", name: "Vendor Portal", icon: Globe2 }
                ].map((dev) => (
                  <button
                    key={dev.id}
                    onClick={() => setPreviewDevice(dev.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      previewDevice === dev.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <dev.icon size={13} />
                    {dev.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 text-slate-100 rounded-xl p-4 font-sans text-xs space-y-3 min-h-[150px] border border-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-500 font-mono ml-2">Varity Systems Layout ({previewDevice})</span>
              </div>

              <div className="space-y-4">
                {tree.map((g: any) => {
                  // Filter based on preview layout type
                  const visibleItems = g.items.filter((item: any) => {
                    if (previewDevice === "mobile") return item.mobileVisible !== false;
                    if (previewDevice === "customer") return item.customerPortalVisible === true;
                    if (previewDevice === "vendor") return item.vendorPortalVisible === true;
                    return item.visible !== false;
                  });

                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={g.id} className="space-y-1.5">
                      <span className="text-slate-500 uppercase tracking-widest font-bold text-[9px]">{g.name}</span>
                      <div className="pl-2 space-y-1 border-l border-slate-800">
                        {visibleItems.map((i: any) => (
                          <div key={i.id} className="flex items-center gap-2 text-slate-300 py-0.5 hover:text-white">
                            <span className="w-1 h-1 bg-primary rounded-full"></span>
                            <span>{i.title}</span>
                            {i.route && <span className="font-mono text-[9px] text-slate-500 ml-auto">{i.route}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right side Properties and Versioning panel */}
        <div className="space-y-6">
          
          {/* Properties Editor Sidebar */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Settings size={16} className="text-primary" />
              Properties Inspector
            </h3>

            {selectedNode ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">NODE TYPE</label>
                  <span className="px-2 py-0.5 bg-muted rounded font-bold">{nodeType}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">TITLE / DISPLAY NAME</label>
                  <span className="font-semibold text-foreground text-sm">{selectedNode.name || selectedNode.title}</span>
                </div>

                {nodeType === "ITEM" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">ROUTE PREFIX PATH</label>
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-1.5 rounded block">
                        {selectedNode.route || "None (Parent Container)"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">ICON IDENTIFIER</label>
                      <span className="font-mono">{selectedNode.icon || "—"}</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">VISIBILITY TARGETS</label>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span>Visible:</span>
                          <span className="font-semibold">{selectedNode.visible !== false ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mobile dashboard:</span>
                          <span className="font-semibold">{selectedNode.mobileVisible ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Customer Portal:</span>
                          <span className="font-semibold">{selectedNode.customerPortalVisible ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Vendor Portal:</span>
                          <span className="font-semibold">{selectedNode.vendorPortalVisible ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {nodeType === "GROUP" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">GROUP CODE</label>
                      <span className="font-mono font-bold">{selectedNode.code}</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">DESCRIPTION</label>
                      <p className="text-muted-foreground">{selectedNode.description || "No description configured."}</p>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-border flex gap-2">
                  <button
                    onClick={() => {
                      if (nodeType === "GROUP") {
                        setEditingGroup(selectedNode);
                        setGroupModalOpen(true);
                      } else {
                        setEditingItem(selectedNode);
                        setItemModalOpen(true);
                      }
                    }}
                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-center font-semibold text-xs"
                  >
                    Edit Node Properties
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Are you sure you want to delete this navigation node?")) return;
                      try {
                        if (nodeType === "GROUP") {
                          await deleteGroupMutation.mutateAsync({
                            id: selectedNode.id,
                            tenantId: user?.tenantId || 1,
                            actorUserId: user?.id || 1
                          });
                        } else {
                          await deleteItemMutation.mutateAsync({
                            id: selectedNode.id,
                            tenantId: user?.tenantId || 1,
                            actorUserId: user?.id || 1
                          });
                        }
                        toast.success("Deleted node successfully");
                        setSelectedNode(null);
                        setNodeType(null);
                        refetchTree();
                      } catch (err: any) {
                        toast.error(err.message || "Deletion failed");
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-lg border border-rose-200"
                    title="Delete Node"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4 italic">Select a node from the tree to inspect properties.</p>
            )}
          </div>

          {/* Validation Panel Diagnostics */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck size={16} className="text-primary" />
              Diagnostics Checklist
            </h3>

            {diagnostics.anomalies.length === 0 ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-800 dark:text-emerald-400 text-[11px] flex gap-2">
                <CheckCircle size={15} className="shrink-0 text-emerald-600 mt-0.5" />
                <span>Layout matches integrity requirements. Ready to publish.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {diagnostics.anomalies.map((a, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border bg-background text-[11px] flex gap-2">
                    <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${a.severity === "ERROR" ? "text-rose-500" : "text-amber-500"}`} />
                    <div>
                      <span className={`font-mono text-[9px] uppercase px-1 rounded ${
                        a.severity === "ERROR" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>{a.type}</span>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Versions Snapshot & Audit logs */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <h3
              onClick={() => setShowVersions(!showVersions)}
              className="font-bold text-sm text-foreground flex items-center justify-between cursor-pointer border-b border-border pb-3"
            >
              <span className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                Snapshots & Versions
              </span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${showVersions ? "rotate-180" : ""}`} />
            </h3>

            {showVersions && (
              <div className="space-y-3 text-xs">
                <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-border">
                  {versions.length === 0 && <p className="text-xs text-slate-400 py-1 italic">No snapshots available.</p>}
                  {versions.map((v: any) => (
                    <div key={v.id} className="pt-2 first:pt-0 flex items-center justify-between">
                      <div>
                        <div className="font-bold">Version {v.versionNumber}</div>
                        <span className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => handleRestore(v.id)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE/EDIT GROUP DIALOG */}
      {groupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg text-foreground">
                {editingGroup ? `Edit Group: ${editingGroup.name}` : "Create Group Container"}
              </h3>
              <button onClick={() => setGroupModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">GROUP CODE (UNIQUE) *</label>
                <input
                  type="text"
                  disabled={!!editingGroup}
                  value={groupForm.code}
                  onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. OPERATIONS"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">DISPLAY NAME *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g. Operations division"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">DESCRIPTION</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="Group capabilities overview..."
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">ICON</label>
                  <input
                    type="text"
                    value={groupForm.icon}
                    onChange={(e) => setGroupForm({ ...groupForm, icon: e.target.value })}
                    placeholder="e.g. Shield"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">SORT ORDER</label>
                  <input
                    type="number"
                    value={groupForm.displayOrder}
                    onChange={(e) => setGroupForm({ ...groupForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupForm.isVisible}
                    onChange={(e) => setGroupForm({ ...groupForm, isVisible: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Is Visible in navigation</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupForm.isCollapsedByDefault}
                    onChange={(e) => setGroupForm({ ...groupForm, isCollapsedByDefault: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span>Collapsed by default</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE/EDIT ITEM DIALOG */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h3 className="font-bold text-lg text-foreground">
                {editingItem ? `Edit Item: ${editingItem.title}` : "Create Navigation Item"}
              </h3>
              <button onClick={() => setItemModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs flex-1 overflow-y-auto">
              <div>
                <label className="block text-slate-400 font-bold mb-1">TITLE / LABEL *</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="e.g. Sales Pipeline"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">NAVIGATION GROUP *</label>
                  <select
                    value={itemForm.navigationGroupId}
                    onChange={(e) => setItemForm({ ...itemForm, navigationGroupId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                    required
                  >
                    <option value="">Select Group</option>
                    {tree.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">PARENT MENU ITEM</label>
                  <select
                    value={itemForm.parentId}
                    onChange={(e) => setItemForm({ ...itemForm, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  >
                    <option value="">None (Root level inside Group)</option>
                    {tree.flatMap((g: any) => g.items).filter((i: any) => i.id !== editingItem?.id).map((i: any) => (
                      <option key={i.id} value={i.id}>{i.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">MENU TYPE</label>
                  <select
                    value={itemForm.menuType}
                    onChange={(e) => setItemForm({ ...itemForm, menuType: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  >
                    <option value="MODULE">Platform Module</option>
                    <option value="ROUTE">Custom Route path</option>
                    <option value="DASHBOARD">Dashboard widget link</option>
                    <option value="REPORT">Report view</option>
                    <option value="EXTERNAL">External Web URL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">LINKED MODULE</label>
                  <select
                    value={itemForm.platformModuleId}
                    onChange={(e) => setItemForm({ ...itemForm, platformModuleId: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  >
                    <option value="">None</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">ROUTE PATH / REDIRECT URL</label>
                <input
                  type="text"
                  value={itemForm.route}
                  onChange={(e) => setItemForm({ ...itemForm, route: e.target.value })}
                  placeholder="e.g. /crm/leads or https://google.com"
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-slate-400 font-bold mb-1">ICON</label>
                  <div className="flex gap-2 items-center">
                    {/* Live preview */}
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-muted/40">
                      {(() => {
                        const Ic = (LucideIcons as any)[itemForm.icon];
                        return Ic ? <Ic size={18} className="text-primary" /> : <HelpCircle size={18} className="text-destructive" />;
                      })()}
                    </div>
                    <input
                      type="text"
                      value={itemForm.icon}
                      onChange={(e) => { const v = e.target.value; setItemForm(prev => ({ ...prev, icon: v })); }}
                      onFocus={() => setShowIconPicker(true)}
                      placeholder="e.g. Settings"
                      className="flex-1 px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                    />
                  </div>
                  {/* Quick-pick grid */}
                  {showIconPicker && (
                    <>
                      {/* Backdrop — closes picker without interfering with form save */}
                      <div
                        className="fixed inset-0 z-40"
                        onMouseDown={() => { setShowIconPicker(false); setIconSearch(""); }}
                      />
                    <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-xl shadow-xl p-3">
                      <input
                        type="text"
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Search icons…"
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background mb-2 focus:outline-none"
                        autoFocus
                      />
                      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                        {[
                          "Box","Settings","Shield","Home","Users","FileText","Database",
                          "BarChart2","Bell","Calendar","CheckCircle","Cog","Cpu","CreditCard",
                          "Download","Edit","Eye","Filter","Flag","Folder","Globe","Grid",
                          "HelpCircle","Inbox","Key","Layers","Link","List","Lock","LogOut",
                          "Mail","Map","Menu","Monitor","Moon","Package","Pencil","PieChart",
                          "Plus","Power","Printer","RefreshCw","Search","Send","Server",
                          "Share","ShieldCheck","ShoppingCart","Sliders","Star","Sun","Tag",
                          "Terminal","Trash2","TrendingUp","Upload","User","Wallet","Wrench",
                          "Zap","AlertTriangle","Archive","Bookmark","Building","ChevronRight",
                          "Clock","Cloud","Code","Columns","Command","Compass","Copy","Crop",
                          "Activity","Award","Briefcase","Camera","Cast","Coffee","Crosshair"
                        ]
                          .filter(n => n.toLowerCase().includes(iconSearch.toLowerCase()))
                          .map(name => {
                            const Ic = (LucideIcons as any)[name];
                            if (!Ic) return null;
                            return (
                              <button
                                key={name}
                                type="button"
                                title={name}
                                onClick={() => {
                                  setItemForm(prev => ({ ...prev, icon: name }));
                                  setShowIconPicker(false);
                                  setIconSearch("");
                                }}
                                className={`p-1.5 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors ${itemForm.icon === name ? "bg-primary/15 ring-1 ring-primary" : ""}`}
                              >
                                <Ic size={16} />
                              </button>
                            );
                          })}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowIconPicker(false); setIconSearch(""); }}
                        className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center"
                      >Close</button>
                    </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">DISPLAY ORDER</label>
                  <input
                    type="number"
                    value={itemForm.displayOrder}
                    onChange={(e) => setItemForm({ ...itemForm, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block mb-1">Visibility Targets</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemForm.visible}
                      onChange={(e) => setItemForm({ ...itemForm, visible: e.target.checked })}
                      className="rounded border-border text-primary"
                    />
                    <span>Visible in Core Layout</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemForm.mobileVisible}
                      onChange={(e) => setItemForm({ ...itemForm, mobileVisible: e.target.checked })}
                      className="rounded border-border text-primary"
                    />
                    <span>Visible in Mobile App</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-400 block mb-1">Portals Visibility</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemForm.customerPortalVisible}
                      onChange={(e) => setItemForm({ ...itemForm, customerPortalVisible: e.target.checked })}
                      className="rounded border-border text-primary"
                    />
                    <span>Customer Portal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemForm.vendorPortalVisible}
                      onChange={(e) => setItemForm({ ...itemForm, vendorPortalVisible: e.target.checked })}
                      className="rounded border-border text-primary"
                    />
                    <span>Vendor Portal</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setItemModalOpen(false); setShowIconPicker(false); setIconSearch(""); }}
                  className="px-4 py-2 border border-border rounded-xl hover:bg-muted text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
