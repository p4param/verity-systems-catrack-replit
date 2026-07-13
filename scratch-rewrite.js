const fs = require('fs');

const filePath = 'src/app/(dashboard)/settings/platform/entities/components/field-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The replacement code:
const newRenderStart = `  const isLookup = RuntimeRegistry.isLookupField({ dataSource });
  const currentStatus = initialData?.status || "DRAFT";
  
  // Data sources grouping
  const allowedDataSources = MetadataRegistry.DataSources;
  const groupedDataSources = allowedDataSources.reduce((acc, source) => {
    const category = (source as any).category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(source);
    return acc;
  }, {} as Record<string, typeof allowedDataSources>);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    
    const template = MetadataRegistry.FieldTemplates.find(t => t.type === templateId);
    if (template) {
      // Auto-populate based on template
      setValue("dataType", template.dataType as any);
      setValue("dataSource", template.dataSource as any);
      
      // We must use setTimeout to ensure uiControl sets AFTER capability filters update
      setTimeout(() => {
        setValue("uiControl", template.uiControl as any);
      }, 0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-card text-card-foreground max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
            <div>
              <DialogTitle>{isNew ? "Add Field" : "Edit Field"}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                \${currentStatus === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                  currentStatus === 'ARCHIVED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}\`
              }>
                {currentStatus}
              </span>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-6 py-4 flex flex-col">
            <div className="mb-4 p-3 border border-primary/20 bg-primary/5 rounded-lg flex items-center gap-4">
              <label className="text-sm font-semibold text-primary whitespace-nowrap">Apply Template:</label>
              <select onChange={handleTemplateChange} className="flex-1 px-3 py-1.5 bg-background border border-border rounded text-sm focus:ring-2 focus:ring-primary/20">
                <option value="">-- Choose a template to auto-fill properties --</option>
                {MetadataRegistry.FieldTemplates.map(t => (
                  <option key={t.type} value={t.type}>{t.name} ({t.description})</option>
                ))}
              </select>
            </div>

            <Tabs defaultValue="general" className="w-full h-full flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-7 mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <TabsContent value="general" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Field Label</label>
                      <input
                        {...register("label")}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. Customer Name"
                      />
                      {errors.label && <p className="text-rose-500 text-xs mt-1">{errors.label.message as string}</p>}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Field Code</label>
                      <input
                        {...register("code")}
                        className={\`w-full px-3 py-2 \${(!isNew && currentStatus !== "DRAFT") ? 'bg-muted/50' : 'bg-background'} border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20\`}
                        placeholder="AUTO_GENERATED"
                        readOnly={!isNew && currentStatus !== "DRAFT"}
                      />
                      {(!isNew && currentStatus !== "DRAFT") && <p className="text-muted-foreground text-[10px] mt-1">Code is locked because field has been published.</p>}
                      {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code.message as string}</p>}
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Internal Name (Optional)</label>
                      <input
                        {...register("metadata.internalName")}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. customerName"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Category</label>
                      <input
                        {...register("metadata.category")}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. General, Financial"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Description</label>
                      <textarea
                        {...register("metadata.description")}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px]"
                        placeholder="Provide a description of this field's purpose"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="data" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg border-border bg-muted/10">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Storage Type</label>
                      <select {...register("dataType")} className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm focus:ring-2 focus:ring-primary/20">
                        {MetadataRegistry.DataTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {errors.dataType && <p className="text-rose-500 text-xs mt-1">{errors.dataType.message as string}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Data Source</label>
                      <select {...register("dataSource")} className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm focus:ring-2 focus:ring-primary/20">
                        {Object.entries(groupedDataSources).map(([category, sources]) => (
                          <optgroup key={category} label={category}>
                            {sources.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {errors.dataSource && <p className="text-rose-500 text-xs mt-1">{errors.dataSource.message as string}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">UI Control</label>
                      <select {...register("uiControl")} className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm focus:ring-2 focus:ring-primary/20">
                        {Object.entries(groupedControls).map(([category, catControls]) => (
                          <optgroup key={category} label={category}>
                            {catControls.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.status === "Preview" ? " (Preview)" : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {errors.uiControl && <p className="text-rose-500 text-xs mt-1">{errors.uiControl.message as string}</p>}
                    </div>
                  </div>

                  {isLookup && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20">
                      <LookupConfigurator form={{ register, control, watch, formState: { errors } } as any} />
                    </div>
                  )}

                  {dataSource === "STATIC" && (uiControl === "SELECT" || uiControl === "MULTI_SELECT" || uiControl === "CHECKBOX_GROUP" || uiControl === "RADIO_GROUP") && (
                    <div className="border border-border rounded-lg p-4 bg-muted/20">
                      <FieldOptionsManager form={{ register, control, watch, formState: { errors } } as any} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="validation" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex items-center gap-4 p-4 border rounded-lg border-border bg-muted/10">
                      <div className="flex items-center gap-2 flex-1">
                        <input type="checkbox" {...register("required")} id="field-required" className="w-4 h-4 accent-primary" />
                        <div>
                          <label htmlFor="field-required" className="text-sm font-semibold block cursor-pointer">Required</label>
                          <span className="text-xs text-muted-foreground">User must provide a value</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <input type="checkbox" {...register("unique")} id="field-unique" className="w-4 h-4 accent-primary" />
                        <div>
                          <label htmlFor="field-unique" className="text-sm font-semibold block cursor-pointer">Unique</label>
                          <span className="text-xs text-muted-foreground">Value must be globally unique</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Validation Profile</label>
                      <select {...register("metadata.validationProfile")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                        <option value="">-- None --</option>
                        {MetadataRegistry.ValidationProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Validation Trigger</label>
                      <select {...register("metadata.validationTrigger")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                        <option value="">-- Default --</option>
                        <option value="ON_CHANGE">On Change</option>
                        <option value="ON_SAVE">On Save</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Regex Pattern</label>
                      <input {...register("metadata.regex")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. ^[a-z]+$" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Custom Error Message</label>
                      <input {...register("metadata.validationMessage")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Message shown when validation fails" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Minimum Length / Value</label>
                      <input type="number" {...register("metadata.minLength", { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. 5" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Maximum Length / Value</label>
                      <input type="number" {...register("metadata.maxLength", { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. 100" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="behavior" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Default Value</label>
                      <input {...register("defaultValue")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Initial value for new records" />
                    </div>

                    <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-lg border-border bg-muted/10">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isReadonly")} id="field-readonly" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-readonly" className="text-sm font-semibold cursor-pointer">Read Only</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isHidden")} id="field-hidden" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-hidden" className="text-sm font-semibold cursor-pointer">Hidden</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isDisabled")} id="field-disabled" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-disabled" className="text-sm font-semibold cursor-pointer">Disabled</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isCalculated")} id="field-calculated" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-calculated" className="text-sm font-semibold cursor-pointer">Calculated</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isSystemManaged")} id="field-system" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-system" className="text-sm font-semibold cursor-pointer">System Managed</label>
                      </div>
                    </div>
                    
                    <div className="col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-lg border-border bg-muted/10">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isCopyable")} id="field-copyable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-copyable" className="text-sm font-semibold cursor-pointer">Copyable</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isExportable")} id="field-exportable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-exportable" className="text-sm font-semibold cursor-pointer">Exportable</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("metadata.isPrintable")} id="field-printable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-printable" className="text-sm font-semibold cursor-pointer">Printable</label>
                      </div>
                    </div>

                    <div className="col-span-2 grid grid-cols-3 gap-4 p-4 border rounded-lg border-border bg-muted/10 mt-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("searchable")} id="field-searchable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-searchable" className="text-sm font-semibold cursor-pointer">Searchable</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("sortable")} id="field-sortable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-sortable" className="text-sm font-semibold cursor-pointer">Sortable</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" {...register("filterable")} id="field-filterable" className="w-4 h-4 accent-primary" />
                        <label htmlFor="field-filterable" className="text-sm font-semibold cursor-pointer">Filterable</label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Formatter</label>
                      <select {...register("metadata.formatter")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                        <option value="">-- Raw Display --</option>
                        {MetadataRegistry.Formatters.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Icon</label>
                      <input {...register("metadata.icon")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. User, Mail, DollarSign" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Placeholder</label>
                      <input {...register("metadata.placeholder")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Hint text shown when empty" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Help Text</label>
                      <input {...register("metadata.helpText")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Additional instructions below the field" />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Tooltip</label>
                      <input {...register("metadata.tooltip")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Text shown on hover" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Prefix</label>
                      <input {...register("metadata.prefix")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. $" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Suffix</label>
                      <input {...register("metadata.suffix")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. USD" />
                    </div>
                    
                    <div className="col-span-2 grid grid-cols-3 gap-4 border p-4 rounded-lg border-border bg-muted/10">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1">Width</label>
                        <input type="number" {...register("metadata.width", { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. 100" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1">Width Unit</label>
                        <select {...register("metadata.widthUnit")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                          <option value="">-- Auto --</option>
                          <option value="px">Pixels (px)</option>
                          <option value="%">Percentage (%)</option>
                          <option value="rem">REM</option>
                          <option value="ch">Characters (ch)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1">Alignment</label>
                        <select {...register("metadata.alignment")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm">
                          <option value="">-- Default --</option>
                          <option value="LEFT">Left</option>
                          <option value="CENTER">Center</option>
                          <option value="RIGHT">Right</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-bold text-muted-foreground mb-1">Custom CSS Class</label>
                        <input {...register("metadata.cssClass")} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. font-bold text-blue-500" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 m-0 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1">Display Order</label>
                      <input type="number" {...register("displayOrder", { valueAsNumber: true })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="e.g. 10" />
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg border-primary/20 bg-primary/5 text-sm text-primary mt-4">
                    <p className="font-semibold mb-1">Future Enhancements</p>
                    <p className="text-muted-foreground">Additional advanced capabilities and diagnostics will be exposed here in future platform iterations.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="dependencies" className="space-y-4 m-0 pb-4">
                  <div className="p-4 border rounded-lg border-border bg-muted/10 text-sm">
                    <p className="font-semibold mb-2">Cross-Reference Dependencies</p>
                    <p className="text-muted-foreground text-xs mb-4">
                      This is a read-only view of where this field is utilized across the platform. Future updates will track dependencies automatically.
                    </p>
                    
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Views (0 dependencies)</li>
                      <li className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Layouts (0 dependencies)</li>
                      <li className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Workflows (0 dependencies)</li>
                      <li className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded"><span className="w-2 h-2 rounded-full bg-slate-300"></span> APIs (0 dependencies)</li>
                    </ul>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="p-4 pt-4 border-t border-border bg-muted/10 mt-auto shrink-0">
            <div className="flex justify-end gap-3 w-full">
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
                {isNew ? "Create Field" : "Save Changes"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );`;

// Find where to start replacing
const startToken = '  const isLookup = RuntimeRegistry.isLookupField({ dataSource });';
const startIdx = content.indexOf(startToken);

if (startIdx === -1) {
  console.error("Could not find start token");
  process.exit(1);
}

// Slice content up to startIdx and append newRenderStart
const newContent = content.slice(0, startIdx) + newRenderStart;

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log('Done rewriting field-dialog.tsx render');
