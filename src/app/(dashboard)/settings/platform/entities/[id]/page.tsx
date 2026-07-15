"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, ChevronRight, History, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useEntity,
  useCreateEntity,
  useUpdateEntity
} from "@/modules/platform/configuration/hooks/use-entities";
import { usePlatformModules } from "@/modules/platform/configuration/hooks/use-platform-modules";
import { entitySchema } from "@/modules/platform/configuration/validations/entity-validation";
import { PublishDialog } from "../components/publish-dialog";
import { FieldsTab } from "../components/fields-tab";
import { ViewsTab } from "../components/views-tab";
import { LayoutViewsTab } from "../components/layout-views-tab";

export default function EntityDetailsPage() {
  const { id } = useParams();
  const isNew = id === "new";
  const router = useRouter();
  const { user } = useAuth();

  const { data: entity, isLoading: loadingEntity, isError, error } = useEntity(isNew ? "" : (id as string));
  const { data: modules = [] } = usePlatformModules();

  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();

  const [activeTab, setActiveTab] = useState("general");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // ... (form setup)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      moduleId: "",
      code: "",
      name: "",
      pluralName: "",
      description: "",
      allowCRUD: true,
      allowImport: false,
      allowExport: false,
      allowWorkflow: false,
      allowAttachments: false,
      allowAudit: true,
      allowComments: false,
      allowTags: false,
      allowHierarchy: false,
      allowSoftDelete: true,
      status: "DRAFT",
      isActive: true,
      isSystem: false,
      isCustom: true,
      metadataLocked: false,
      showInNavigation: false,
      menuGroup: "",
      menuOrder: 0,
      icon: "",
      route: "",
      apiEnabled: true,
      apiName: ""
    }
  });

  useEffect(() => {
    if (!isNew && entity) {
      console.log("Resetting form with entity data:", entity);
      reset({
        moduleId: entity.moduleId,
        code: entity.code,
        name: entity.name,
        pluralName: entity.pluralName,
        description: entity.description || "",
        allowCRUD: entity.allowCRUD,
        allowImport: entity.allowImport,
        allowExport: entity.allowExport,
        allowWorkflow: entity.allowWorkflow,
        allowAttachments: entity.allowAttachments,
        allowAudit: entity.allowAudit,
        allowComments: entity.allowComments,
        allowTags: entity.allowTags,
        allowHierarchy: entity.allowHierarchy,
        allowSoftDelete: entity.allowSoftDelete,
        status: entity.status,
        isActive: entity.isActive,
        isSystem: entity.isSystem,
        isCustom: entity.isCustom,
        metadataLocked: entity.metadataLocked,
        showInNavigation: entity.showInNavigation,
        menuGroup: entity.menuGroup || "",
        menuOrder: entity.menuOrder,
        icon: entity.icon || "",
        route: entity.route || "",
        apiEnabled: entity.apiEnabled,
        apiName: entity.apiName || ""
      });
    }
  }, [isNew, entity, reset]);

  const onSubmit = async (data: any) => {
    try {
      if (isNew) {
        await createMutation.mutateAsync(data);
        toast.success("Entity created successfully");
        router.push("/settings/platform/entities");
      } else {
        await updateMutation.mutateAsync({ id: id as string, data });
        toast.success("Entity updated successfully");
        router.push("/settings/platform/entities");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save entity");
    }
  };

  const onError = (errors: any) => {
    toast.error("Please fix the validation errors in the General tab.");
    console.error("Validation Errors:", errors);
  };

  if (loadingEntity) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-64 items-center justify-center text-rose-500">
        <p className="font-bold">Failed to load entity details</p>
        <p className="text-sm">{error?.message}</p>
        <button onClick={() => router.push("/settings/platform/entities")} className="mt-4 px-4 py-2 bg-muted text-foreground rounded-lg text-sm">Go Back</button>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General" },
    ...(!isNew ? [{ id: "fields", label: "Fields" }] : []),
    ...(!isNew ? [{ id: "views", label: "Data Views" }] : []),
    ...(!isNew ? [{ id: "layouts", label: "Layout Views" }] : []),
    { id: "navigation", label: "Navigation" },
    { id: "runtime", label: "Runtime" },
    { id: "api", label: "API" },
    { id: "advanced", label: "Advanced" },
    { id: "audit", label: "Audit" }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
        <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
        <ChevronRight size={14} />
        <Link href="/settings/platform" className="hover:text-foreground transition-colors">Platform</Link>
        <ChevronRight size={14} />
        <Link href="/settings/platform/entities" className="hover:text-foreground transition-colors">Business Entities</Link>
        <ChevronRight size={14} />
        <span className="text-foreground">{isNew ? "New Entity" : entity?.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings/platform/entities"
            className="p-2 border border-border rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isNew ? "Create Business Entity" : `Edit Entity: ${entity?.name}`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              type="button"
              onClick={() => setPublishDialogOpen(true)}
              className="bg-emerald-500 text-white px-4 py-2 rounded-xl hover:bg-emerald-600 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
            >
              <Rocket size={16} /> Publish
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit(onSubmit, onError)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all"
          >
            <Save size={16} /> Save Entity
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab !== "audit" ? (
            <form className="space-y-6">
              {activeTab === "general" && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Module</label>
                    <select
                      {...register("moduleId")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="">Select Module...</option>
                      {modules.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {errors.moduleId && <p className="text-rose-500 text-xs mt-1">{errors.moduleId.message as string}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Entity Code</label>
                    <input
                      {...register("code")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. CUSTOMER"
                      disabled={!isNew}
                    />
                    {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code.message as string}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Entity Name</label>
                    <input
                      {...register("name")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. Customer"
                    />
                    {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message as string}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Plural Name</label>
                    <input
                      {...register("pluralName")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. Customers"
                    />
                    {errors.pluralName && <p className="text-rose-500 text-xs mt-1">{errors.pluralName.message as string}</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Description</label>
                    <textarea
                      {...register("description")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm h-24"
                      placeholder="Entity description..."
                    />
                  </div>
                </div>
              )}

              {activeTab === "navigation" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                    <div>
                      <label className="font-semibold text-sm">Show in Navigation</label>
                      <p className="text-xs text-muted-foreground">Display this entity in the sidebar menu.</p>
                    </div>
                    <input type="checkbox" {...register("showInNavigation")} className="w-4 h-4" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Menu Group</label>
                    <input
                      {...register("menuGroup")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. CRM"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Route</label>
                    <input
                      {...register("route")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. /crm/customers"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Icon (Lucide name)</label>
                    <input
                      {...register("icon")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. Users"
                    />
                  </div>
                </div>
              )}

              {activeTab === "runtime" && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Status</label>
                    <select
                      {...register("status")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="VALIDATED">Validated</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                    <div>
                      <label className="font-semibold text-sm">Is Active</label>
                      <p className="text-xs text-muted-foreground">Enable this entity in the application.</p>
                    </div>
                    <input type="checkbox" {...register("isActive")} className="w-4 h-4" />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                    <div>
                      <label className="font-semibold text-sm">Is Custom</label>
                      <p className="text-xs text-muted-foreground">Created by tenant vs system predefined.</p>
                    </div>
                    <input type="checkbox" {...register("isCustom")} className="w-4 h-4" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                    <div>
                      <label className="font-semibold text-sm">Metadata Locked</label>
                      <p className="text-xs text-muted-foreground">Prevent further edits to metadata structure.</p>
                    </div>
                    <input type="checkbox" {...register("metadataLocked")} className="w-4 h-4" />
                  </div>
                </div>
              )}

              {activeTab === "api" && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                    <div>
                      <label className="font-semibold text-sm">API Enabled</label>
                      <p className="text-xs text-muted-foreground">Expose this entity via REST API endpoints.</p>
                    </div>
                    <input type="checkbox" {...register("apiEnabled")} className="w-4 h-4" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">API Name</label>
                    <input
                      {...register("apiName")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                      placeholder="e.g. customers"
                    />
                    {errors.apiName && <p className="text-rose-500 text-xs mt-1">{errors.apiName.message as string}</p>}
                  </div>
                </div>
              )}

              {activeTab === "advanced" && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: "allowCRUD", label: "Allow CRUD", desc: "Enable Create, Read, Update, Delete UI." },
                    { field: "allowImport", label: "Allow Import", desc: "Enable bulk import via CSV/Excel." },
                    { field: "allowExport", label: "Allow Export", desc: "Enable exporting list data." },
                    { field: "allowWorkflow", label: "Allow Workflow", desc: "Enable state-machine workflows." },
                    { field: "allowAttachments", label: "Allow Attachments", desc: "Support file uploads." },
                    { field: "allowAudit", label: "Allow Audit", desc: "Track field-level changes." },
                    { field: "allowComments", label: "Allow Comments", desc: "Enable record-level comments." },
                    { field: "allowTags", label: "Allow Tags", desc: "Enable tagging on records." },
                    { field: "allowHierarchy", label: "Allow Hierarchy", desc: "Enable parent-child tree structure." },
                    { field: "allowSoftDelete", label: "Allow Soft Delete", desc: "Mark deleted instead of hard delete." },
                  ].map((item) => (
                    <div key={item.field} className="flex items-center justify-between p-4 border border-border rounded-xl bg-background">
                      <div>
                        <label className="font-semibold text-sm">{item.label}</label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <input type="checkbox" {...register(item.field as any)} className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "fields" && !isNew && (
                <FieldsTab entityId={id as string} />
              )}
              
              {activeTab === "views" && !isNew && (
                <ViewsTab entityId={id as string} />
              )}

              {activeTab === "layouts" && !isNew && (
                <LayoutViewsTab entityId={id as string} />
              )}
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 border border-border">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-1">Audit Trail</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {isNew
                  ? "Audit history will be available once the entity is created."
                  : "Audit history tracks lifecycle events and structural changes to this entity over time."}
              </p>
              {!isNew && (
                <div className="text-xs font-mono bg-muted px-3 py-1.5 rounded border border-border">
                  Audit Log UI component pending configuration...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        entityId={id as string}
        entityName={entity?.name || ""}
      />
    </div>
  );
}
