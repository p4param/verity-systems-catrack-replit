"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { History, AlertCircle, Tags, Ruler, MapPin, Hash, Sliders, Building2, Truck, Tag } from "lucide-react";

const MASTER_TABS = [
    { id: "categories", name: "Categories", icon: Tag },
    { id: "movement-types", name: "Movement Types", icon: History },
    { id: "reason-codes", name: "Reason Codes", icon: AlertCircle },
    { id: "stock-conditions", name: "Stock Conditions", icon: Tags },
    { id: "units", name: "Units", icon: Ruler },
    { id: "locations", name: "Locations", icon: MapPin },
    { id: "suppliers", name: "Suppliers", icon: Building2 },
    { id: "vendors", name: "Vendors", icon: Truck },
    { id: "document-numbering", name: "Numbering", icon: Hash },
    { id: "settings", name: "Settings", icon: Sliders },
];

export default function MastersLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-6 p-6 pb-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Master Data</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Master Data Configuration</h1>
                <p className="text-muted-foreground mt-1 text-sm">System configuration and core inventory references.</p>
            </div>

            <div className="flex flex-wrap gap-2 pb-2">
                {MASTER_TABS.map(tab => {
                    const href = `/inventory/masters/${tab.id}`;
                    const isActive = pathname.includes(tab.id);

                    return (
                        <Link
                            key={tab.id}
                            href={href}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                                isActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.name}
                        </Link>
                    );
                })}
            </div>

            <div className="min-h-[400px] -mx-6">
                {children}
            </div>
        </div>
    );
}
