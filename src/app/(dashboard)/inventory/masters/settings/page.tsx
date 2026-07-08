"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const { fetchWithAuth, user } = useAuth();

    const canUpdate = user?.permissions?.includes("INVENTORY_SETTINGS_MANAGE");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth("/api/masters/settings");
            setSettings(data);
        } catch (error) {
            console.error("Failed to load settings", error);
            setError("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setSaving(true);

        try {
            await fetchWithAuth("/api/masters/settings", {
                method: "PUT",
                body: JSON.stringify(settings)
            });
            setSuccess(true);
            toast.success("Settings saved successfully!");
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const msg = err.message || "Failed to save settings";
            setError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-muted-foreground">Loading settings...</div>;
    }

    if (!settings && !loading) {
        return <div className="p-6 text-red-500">Failed to load system settings. Please try again.</div>;
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Inventory Settings</h1>
                <p className="text-sm text-muted-foreground">Configure global behaviors and automated rule constraints.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow border border-border p-6 space-y-8">
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-200">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm font-medium border border-green-200">
                        Settings saved successfully!
                    </div>
                )}

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-foreground border-b pb-2">Stock Control Policies</h2>

                    <div className="flex flex-col gap-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    checked={settings.allowNegativeStock}
                                    onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
                                    disabled={!canUpdate}
                                    className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    Allow Negative Stock Operations
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Permits outbound allocations even if system thinks local quantity is zero. Only enable if manual counts override system frequently.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    checked={settings.requireApprovalForRecovery}
                                    onChange={(e) => setSettings({ ...settings, requireApprovalForRecovery: e.target.checked })}
                                    disabled={!canUpdate}
                                    className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    Require Manager Approval for Recoveries
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    When stock is marked Missing or Damaged, require a Manager to approve the ledger entry before it deducts total company valuation.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-foreground border-b pb-2">Operational Defaults</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Default Laundry SLA (Days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={settings.defaultLaundrySLA}
                                onChange={(e) => setSettings({ ...settings, defaultLaundrySLA: parseInt(e.target.value, 10) })}
                                disabled={!canUpdate}
                                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:ring-primary focus:border-primary disabled:bg-muted/50"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Standard turnaround time expected from laundry vendors before flagging as overdue.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Global Currency Symbol
                            </label>
                            <input
                                type="text"
                                maxLength={5}
                                value={settings.currencySymbol || "$"}
                                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                                disabled={!canUpdate}
                                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:ring-primary focus:border-primary disabled:bg-muted/50"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Symbol to display for all financial valuations and credit limits (e.g. $, £, €, ₹).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-foreground border-b pb-2">Features</h2>

                    <div className="flex flex-col gap-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    checked={settings.enableMultiLocation}
                                    onChange={(e) => setSettings({ ...settings, enableMultiLocation: e.target.checked })}
                                    disabled={!canUpdate}
                                    className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    Enable Multi-Location Tracking
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Turns on features to split inventory quantities across multiple warehouses or staging zones.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="flex items-center h-5">
                                <input
                                    type="checkbox"
                                    checked={settings.enableValuation}
                                    onChange={(e) => setSettings({ ...settings, enableValuation: e.target.checked })}
                                    disabled={!canUpdate}
                                    className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                    Enable Value Tracking
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Track unit costs and generate valuation reports for total asset holdings.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {canUpdate && (
                    <div className="pt-6 border-t border-border flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? "Saving Changes..." : "Save Settings"}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
