import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listControls } from "../registry/UIControlRegistry";
import { RuntimeContext } from "../context/RuntimeContext";
import { diagnosticsService } from "../services/DiagnosticsService";

interface RuntimeDiagnosticsProps {
  context: RuntimeContext;
  manifest: any;
  layout: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  performanceMetrics?: {
    initialRenderMs?: number;
    tabSwitchMs?: number;
    validationMs?: number;
    valueChangeMs?: number;
  };
}

export const RuntimeDiagnostics: React.FC<RuntimeDiagnosticsProps> = ({
  context,
  manifest,
  layout,
  open,
  onOpenChange,
  performanceMetrics,
}) => {
  // Subscribe to changes in the diagnostics status from DiagnosticsService
  useEffect(() => {
    const unsub = diagnosticsService.subscribe((enabled) => {
      onOpenChange(enabled);
    });
    // Sync initial state
    if (diagnosticsService.isEnabled() !== open) {
      onOpenChange(diagnosticsService.isEnabled());
    }
    return unsub;
  }, [open, onOpenChange]);

  const registered = listControls();

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      diagnosticsService.setEnabled(val);
    }}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            CAP Platform Developer Diagnostics
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="level1" className="flex-1 flex flex-col overflow-hidden min-h-0 pt-4">
          <TabsList className="shrink-0 justify-start border-b border-border bg-transparent rounded-none h-auto p-0 mb-4 gap-4 overflow-x-auto">
            <TabsTrigger 
              value="level1"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 text-sm whitespace-nowrap"
            >
              Level 1: Metadata
            </TabsTrigger>
            <TabsTrigger 
              value="level2"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 text-sm whitespace-nowrap"
            >
              Level 2: Manifest
            </TabsTrigger>
            <TabsTrigger 
              value="level3"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 text-sm whitespace-nowrap"
            >
              Level 3: Layout
            </TabsTrigger>
            <TabsTrigger 
              value="level4"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 text-sm whitespace-nowrap"
            >
              Level 4: Controls ({registered.length})
            </TabsTrigger>
            <TabsTrigger 
              value="level5"
              className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 text-sm whitespace-nowrap"
            >
              Level 5: Performance
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {/* Level 1: Metadata */}
            <TabsContent value="level1" className="m-0 h-full">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto select-all leading-normal text-muted-foreground border border-border">
                {JSON.stringify(context.entity, null, 2)}
              </pre>
            </TabsContent>

            {/* Level 2: Manifest */}
            <TabsContent value="level2" className="m-0 h-full">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto select-all leading-normal text-muted-foreground border border-border">
                {JSON.stringify(manifest, null, 2)}
              </pre>
            </TabsContent>

            {/* Level 3: Layout */}
            <TabsContent value="level3" className="m-0 h-full">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto select-all leading-normal text-muted-foreground border border-border">
                {JSON.stringify(layout, null, 2)}
              </pre>
            </TabsContent>

            {/* Level 4: Controls */}
            <TabsContent value="level4" className="m-0 h-full space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-xs font-semibold uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Control Code</th>
                      <th className="px-4 py-3">Version</th>
                      <th className="px-4 py-3">Capabilities</th>
                      <th className="px-4 py-3">Offline</th>
                      <th className="px-4 py-3">Bulk Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {registered.map((r) => (
                      <tr key={`${r.code}@${r.version}`} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-semibold font-mono text-xs">{r.code}</td>
                        <td className="px-4 py-3 text-xs font-mono">{`${r.version.major}.${r.version.minor}.${r.version.patch}`}</td>
                        <td className="px-4 py-3 text-xs font-mono opacity-80">{r.renderer.name || "ReactComponent"}</td>
                        <td className="px-4 py-3 text-xs">{r.capabilities.supportsOffline ? "Yes" : "No"}</td>
                        <td className="px-4 py-3 text-xs">{r.capabilities.supportsBulkEdit ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* Level 5: Performance */}
            <TabsContent value="level5" className="m-0 h-full space-y-4">
              <div className="border border-border rounded-lg p-6 bg-card space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Metrics Timings Benchmarks</h4>
                  <p className="text-xs text-muted-foreground">Timings captured during the active form instance session execution.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border p-4 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Initial Form Render</div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                      {performanceMetrics?.initialRenderMs !== undefined ? `${performanceMetrics.initialRenderMs.toFixed(1)} ms` : "Pending..."}
                    </div>
                  </div>
                  <div className="border border-border p-4 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Field Value Change Re-render</div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                      {performanceMetrics?.valueChangeMs !== undefined ? `${performanceMetrics.valueChangeMs.toFixed(1)} ms` : "Pending..."}
                    </div>
                  </div>
                  <div className="border border-border p-4 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Tab Switch Latency</div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                      {performanceMetrics?.tabSwitchMs !== undefined ? `${performanceMetrics.tabSwitchMs.toFixed(1)} ms` : "Pending..."}
                    </div>
                  </div>
                  <div className="border border-border p-4 rounded-md">
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Validation Execution</div>
                    <div className="text-2xl font-bold mt-1 text-primary">
                      {performanceMetrics?.validationMs !== undefined ? `${performanceMetrics.validationMs.toFixed(1)} ms` : "Pending..."}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RuntimeDiagnostics;
