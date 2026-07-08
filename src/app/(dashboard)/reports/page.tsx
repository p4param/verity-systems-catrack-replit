"use client";

import { Card } from "@/components/inventory/InventoryUI";
import {
    BarChart3,
    Truck,
    PieChart,
    TrendingUp,
    Clock,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

const modules = [
    {
        title: "Vendor Intelligence",
        description: "Exposure, performance, aging, and liability reporting for laundry vendors.",
        icon: Truck,
        href: "/reports/vendors",
        color: "bg-blue-500",
        stats: "6 Reports"
    },
    {
        title: "Inventory Analytics",
        description: "Stock levels, replenishment trends, and category distribution.",
        icon: PieChart,
        href: "/reports/inventory",
        color: "bg-emerald-500",
        stats: "Stock DNA",
        disabled: true
    },
    {
        title: "Loss & Recovery",
        description: "Detailed analysis of shrinkage, damage rates, and recovery efficiency.",
        icon: TrendingUp,
        href: "/reports/loss",
        color: "bg-rose-500",
        stats: "Net Loss",
        disabled: true
    },
    {
        title: "SLA Tracking",
        description: "Monitor turnaround times and operational compliance metrics.",
        icon: Clock,
        href: "/reports/sla",
        color: "bg-amber-500",
        stats: "Turnaround",
        disabled: true
    }
];

export default function ReportsLanding() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Enterprise Reporting</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Strategic intelligence and operational analytics derived from the ledger.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules.map((m) => (
                    <Link
                        key={m.title}
                        href={m.disabled ? "#" : m.href}
                        className={m.disabled ? "cursor-not-allowed grayscale" : ""}
                    >
                        <Card className="h-full hover:border-primary/40 transition-all group overflow-hidden relative">
                            <div className="flex items-start justify-between">
                                <div className="space-y-3 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl ${m.color} flex items-center justify-center text-white shadow-lg`}>
                                        <m.icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{m.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                                            {m.description}
                                        </p>
                                    </div>
                                    {!m.disabled && (
                                        <div className="inline-flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider pt-2 group-hover:gap-2.5 transition-all">
                                            Open Report Center <ArrowRight size={14} />
                                        </div>
                                    )}
                                    {m.disabled && (
                                        <div className="text-[10px] font-black uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded w-fit mt-2">
                                            Coming Soon
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-black opacity-5 group-hover:opacity-10 transition-opacity">
                                        {m.stats}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="bg-muted/50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="text-slate-400 mt-1" size={20} />
                <div className="text-sm text-slate-600 leading-relaxed">
                    <strong>Note:</strong> All reports are generated in real-time by aggregating the append-only stock movement ledger. For large datasets, favor specific date range filters for optimal performance.
                </div>
            </div>
        </div>
    );
}
