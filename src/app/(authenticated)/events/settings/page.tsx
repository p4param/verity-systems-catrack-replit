"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function EventSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Event Module Settings</h1>
        <p className="text-sm text-muted-foreground">Configure thresholds, workflow triggers, and default rules.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Workflow Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Strict Location Verification</Label>
              <p className="text-xs text-muted-foreground">Block scheduling events without coordinates verification.</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate Checklists</Label>
              <p className="text-xs text-muted-foreground">Trigger standard SLA checklists on event confirmation.</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
