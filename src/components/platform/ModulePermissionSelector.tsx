"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Search, ChevronDown, ChevronRight, CheckSquare, Square, AlertTriangle, Info } from "lucide-react";

const PURPOSE_OPTIONS = [
  "MODULE_ACCESS",
  "MENU_VISIBILITY",
  "DASHBOARD",
  "REPORTS",
  "API",
  "MOBILE",
  "CUSTOMER_PORTAL",
  "VENDOR_PORTAL",
  "SEARCH",
  "QUICK_ACTION"
] as const;

type PermissionPurpose = (typeof PURPOSE_OPTIONS)[number];

type PermissionRow = {
  id: number;
  code: string;
  description?: string | null;
  isSelected: boolean;
  permissionPurpose: string | null;
  isRequired: boolean;
  displayOrder: number;
};

type Props = {
  moduleId: string | null;
  moduleCode?: string;
  showOnDashboard?: boolean;
  customerPortalVisible?: boolean;
};

export function ModulePermissionSelector({ moduleId, moduleCode, showOnDashboard, customerPortalVisible }: Props) {
  const { fetchWithAuth } = useAuth();

  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [purposeMap, setPurposeMap] = useState<Record<number, PermissionPurpose>>({});
  const [rightPanelPermId, setRightPanelPermId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth<{ success: boolean; data: PermissionRow[] }>(
        `/api/platform/modules/${moduleId}/permissions`
      );
      setPermissions(res.data);
      const sel = new Set<number>();
      const pm: Record<number, PermissionPurpose> = {};
      res.data.forEach((p) => {
        if (p.isSelected) {
          sel.add(p.id);
          if (p.permissionPurpose) pm[p.id] = p.permissionPurpose as PermissionPurpose;
        }
      });
      setSelectedIds(sel);
      setPurposeMap(pm);
    } catch (e: any) {
      setError(e.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [moduleId, fetchWithAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = permissions.filter(
      (p) => !q || p.code.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
    const map: Record<string, PermissionRow[]> = {};
    filtered.forEach((p) => {
      const prefix = p.code.split("_")[0];
      if (!map[prefix]) map[prefix] = [];
      map[prefix].push(p);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, searchQuery]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const togglePermission = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllInGroup = (perms: PermissionRow[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const deselectAllInGroup = (perms: PermissionRow[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleSave = async () => {
    if (!moduleId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await fetchWithAuth(`/api/platform/modules/${moduleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          permissionIds: Array.from(selectedIds),
          purposeMap
        })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const selectedCode = rightPanelPermId != null
    ? permissions.find((p) => p.id === rightPanelPermId)
    : null;

  const hasModuleAccess = Array.from(selectedIds).some(
    (id) => permissions.find((p) => p.id === id)?.code.endsWith("_MODULE_ACCESS") ||
             purposeMap[id] === "MODULE_ACCESS"
  );

  const hasDashboard = Array.from(selectedIds).some(
    (id) => purposeMap[id] === "DASHBOARD"
  );

  const hasCustomerPortal = Array.from(selectedIds).some(
    (id) => purposeMap[id] === "CUSTOMER_PORTAL"
  );

  const warnings: string[] = [];
  if (selectedIds.size > 0 && !hasModuleAccess) {
    warnings.push("No MODULE_ACCESS permission assigned. Users may not be able to access this module.");
  }
  if (hasDashboard && !hasModuleAccess) {
    warnings.push("A Dashboard permission is mapped but no MODULE_ACCESS is assigned.");
  }
  if (hasCustomerPortal && customerPortalVisible === false) {
    warnings.push("A Customer Portal permission is mapped but this module is hidden from the Customer Portal.");
  }

  if (!moduleId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-border">
        <Info size={16} />
        Save the module first to manage permission mappings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Warnings */}
      {warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {w}
        </div>
      ))}

      {error && (
        <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg">
          Permission mappings saved successfully.
        </div>
      )}

      {/* Search + stats row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {selectedIds.size} / {permissions.length} selected
        </span>
      </div>

      {/* Main layout — permission list + right panel */}
      <div className="flex gap-3 min-h-0">
        {/* Permission groups list */}
        <div className="flex-1 border border-border rounded-lg overflow-y-auto max-h-72 bg-background">
          {grouped.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No permissions found.</div>
          ) : (
            grouped.map(([group, perms]) => {
              const selectedCount = perms.filter((p) => selectedIds.has(p.id)).length;
              const allSelected = selectedCount === perms.length;
              const collapsed = collapsedGroups.has(group);
              return (
                <div key={group} className="border-b border-border last:border-b-0">
                  {/* Group header — sticky */}
                  <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-muted/60 backdrop-blur-sm border-b border-border">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                    >
                      {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      <span className="text-xs font-bold uppercase tracking-wide truncate">{group}</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.5 bg-background rounded-full border border-border ml-1 shrink-0">
                        {selectedCount}/{perms.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => allSelected ? deselectAllInGroup(perms) : selectAllInGroup(perms)}
                      className="text-[10px] font-medium text-primary hover:underline shrink-0"
                    >
                      {allSelected ? "None" : "All"}
                    </button>
                  </div>

                  {/* Permission rows */}
                  {!collapsed && (
                    <div className="divide-y divide-border/50">
                      {perms.map((perm) => {
                        const isSelected = selectedIds.has(perm.id);
                        const isFocused = rightPanelPermId === perm.id;
                        return (
                          <div
                            key={perm.id}
                            onClick={() => setRightPanelPermId(isFocused ? null : perm.id)}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                              isFocused ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-muted/40"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); togglePermission(perm.id); }}
                              className="shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare size={15} className="text-primary" />
                              ) : (
                                <Square size={15} className="text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{perm.code}</div>
                              {perm.description && (
                                <div className="text-[10px] text-muted-foreground truncate">{perm.description}</div>
                              )}
                            </div>
                            {isSelected && purposeMap[perm.id] && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-primary/10 text-primary rounded shrink-0">
                                {purposeMap[perm.id]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right detail panel */}
        <div className="w-44 shrink-0 border border-border rounded-lg bg-muted/30 p-3 flex flex-col gap-3 text-xs max-h-72 overflow-y-auto">
          {selectedCode ? (
            <>
              <div>
                <div className="font-semibold text-foreground mb-1 break-all">{selectedCode.code}</div>
                {selectedCode.description && (
                  <div className="text-muted-foreground">{selectedCode.description}</div>
                )}
              </div>
              <div>
                <div className="font-semibold text-muted-foreground mb-1">PURPOSE</div>
                <select
                  value={purposeMap[selectedCode.id] ?? "MODULE_ACCESS"}
                  onChange={(e) =>
                    setPurposeMap((prev) => ({ ...prev, [selectedCode.id]: e.target.value as PermissionPurpose }))
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-[10px] border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {PURPOSE_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="font-semibold text-muted-foreground mb-1">SELECTED</div>
                <div className={`font-medium ${selectedIds.has(selectedCode.id) ? "text-green-600" : "text-muted-foreground"}`}>
                  {selectedIds.has(selectedCode.id) ? "Yes" : "No"}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex-1 flex items-center justify-center text-center leading-relaxed">
              Click a permission to see details and set its purpose
            </div>
          )}
          <div className="mt-auto pt-2 border-t border-border">
            <div className="font-semibold text-muted-foreground mb-1">SUMMARY</div>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Selected</span><span className="font-medium">{selectedIds.size}</span></div>
              <div className="flex justify-between"><span>Total</span><span className="font-medium">{permissions.length}</span></div>
              <div className="flex justify-between"><span>With purpose</span><span className="font-medium">{Object.keys(purposeMap).filter(k => selectedIds.has(Number(k))).length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {saving ? "Saving..." : "Save Permission Mappings"}
        </button>
      </div>
    </div>
  );
}
