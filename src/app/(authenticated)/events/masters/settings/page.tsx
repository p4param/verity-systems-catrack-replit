"use client";

import { Sliders } from "lucide-react";

export default function EventMastersSettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Sliders size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Master Data Settings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Global configuration for event master data defaults.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border divide-y divide-border shadow-sm">
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Default Values</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Event Status</p>
                <p className="text-xs text-muted-foreground">Status assigned when a new event is created</p>
              </div>
              <span className="px-3 py-1.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">INQUIRY</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Priority</p>
                <p className="text-xs text-muted-foreground">Priority assigned when not specified</p>
              </div>
              <span className="px-3 py-1.5 text-xs font-mono font-bold bg-amber-100 text-amber-800 rounded-lg border border-amber-200">MEDIUM</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Currency</p>
                <p className="text-xs text-muted-foreground">Currency for event budgets</p>
              </div>
              <span className="px-3 py-1.5 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">INR</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Seed & Reset</h3>
          <p className="text-xs text-muted-foreground mb-4">
            To re-seed default master data (event types, statuses, priorities), run the Prisma seed script from the server terminal:
          </p>
          <code className="block text-xs font-mono bg-muted/70 border border-border rounded-lg px-4 py-3 text-foreground">
            npx prisma db seed
          </code>
        </div>
      </div>
    </div>
  );
}
