"use client";

import { useState } from "react";
import { Card } from "@/components/inventory/InventoryUI";
import {
    BookOpen,
    HelpCircle,
    Shirt,
    Truck,
    Calendar,
    Database,
    History,
    Activity,
    Info,
    CheckCircle2,
    AlertTriangle,
    PlusCircle,
    RotateCcw
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

export default function InventoryHelpPage() {
    const [activeSection, setActiveSection] = useState("overview");

    const sections = [
        { id: "overview", label: "System Overview", icon: Info },
        { id: "lifecycle", label: "Apparel Lifecycle", icon: Activity },
        { id: "pages", label: "Pages & Modules", icon: BookOpen },
        { id: "guides", label: "Operational Guides", icon: HelpCircle },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/inventory/portal" className="hover:text-foreground hover:underline transition-colors">
                    Inventory Hub
                </Link>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">Help & Guide</span>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Help Center</h1>
                <p className="text-muted-foreground mt-1 text-sm">Understand the ledger-based hybrid architecture, workflows, and operations of the apparel tracking system.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 border-b border-border">
                {sections.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSection(sec.id)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                            activeSection === sec.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <sec.icon size={16} />
                        {sec.label}
                    </button>
                ))}
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 gap-6">
                {activeSection === "overview" && (
                    <div className="space-y-6">
                        <Card title="Ledger-Based Hybrid Architecture" icon={Activity}>
                            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
                                <p>
                                    Our inventory management system is built on a **ledger-based append-only model**. 
                                    This means we do not store static "stock numbers" in the database. Instead, every physical transaction 
                                    (receiving, event allotment, damage, return, laundry) is recorded as a permanent 
                                    <code>StockMovement</code> ledger entry.
                                </p>
                                <div className="p-4 bg-muted/50 border border-border rounded-xl space-y-2">
                                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Key Principles:</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                                        <li><strong>Append-Only</strong>: Ledger entries are never updated or deleted. If a mistake is made, it is corrected by appending an offsetting movement.</li>
                                        <li><strong>Dynamic Availability</strong>: Clean stock, dirty stock, and availability are computed on-the-fly by aggregating all past ledger entries.</li>
                                        <li><strong>Strict Isolation</strong>: All ledger writes and calculations happen within transaction blocks, protecting the system against concurrent booking race conditions.</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="Core Formulas" icon={Info}>
                                <div className="mt-4 space-y-3 text-sm text-slate-600">
                                    <div className="flex justify-between py-2 border-b border-border/50">
                                        <span className="font-semibold text-slate-800">Physical Stock</span>
                                        <span>Sum of all clean & dirty movements</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-border/50">
                                        <span className="font-semibold text-slate-800">Reserved Qty</span>
                                        <span>Sum of bookings for upcoming events</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-border/50">
                                        <span className="font-semibold text-slate-800">In Laundry</span>
                                        <span>Sent to laundry - returned - damaged/missing</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="font-bold text-primary">Net Available</span>
                                        <span className="font-bold text-primary">Clean Physical - Active Reservations</span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Guardrails & Safety Settings" icon={CheckCircle2}>
                                <div className="mt-4 space-y-3 text-sm text-slate-600">
                                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                        <p className="font-semibold text-emerald-800 text-xs">Negative Stock Protection</p>
                                        <p className="text-[11px] text-emerald-600 mt-0.5">By default, the system blocks event allotments and laundry dispatches if they exceed active stock levels, preventing negative inventory.</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 border border-border rounded-lg">
                                        <p className="font-semibold text-slate-800 text-xs">Minimum Level Alerts</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">When Net Available Stock drops below the apparel's defined min-stock level, the system triggers alerts on the main dashboard.</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeSection === "lifecycle" && (
                    <Card title="The Apparel Inventory Lifecycle" icon={Activity}>
                        <div className="mt-6 space-y-6">
                            <div className="relative border-l-2 border-primary/20 pl-6 ml-4 space-y-6">
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">1. Master Registration</h4>
                                    <p className="text-xs text-slate-500 mt-1">An apparel item (e.g. Tactical Vest) is defined in <strong>Masters</strong> with unit values, categories, and min-stock levels.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">2. Inbound PO & Goods Receipt</h4>
                                    <p className="text-xs text-slate-500 mt-1">A Purchase Order is approved, and items are received. Clean items increment the ledger via `PURCHASE_RECEIVE` (+CLEAN), while any damaged items create `PURCHASE_DAMAGE_ON_ARRIVAL` (-CLEAN) write-offs.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">3. Logical Booking / Reservation</h4>
                                    <p className="text-xs text-slate-500 mt-1">Events book clean items in advance. This acts as a logical reservation hold, decreasing the Net Available stock without generating physical ledger movements.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">4. Physical Event Allotment</h4>
                                    <p className="text-xs text-slate-500 mt-1">Before the event, items are physically checked out of the warehouse. This writes `EVENT_ALLOTMENT` (-CLEAN) to the ledger, moving items into active allotment custody.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">5. Return & Reconcile (Dirty Pool)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Returned items from events are recorded as `EVENT_RETURN` (+DIRTY). Any items missing or damaged on the field are logged as outbound losses.</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                                    <h4 className="font-bold text-sm text-slate-800">6. Laundry Dispatch & Return</h4>
                                    <p className="text-xs text-slate-500 mt-1">Dirty pool items are dispatched to laundry (`LAUNDRY_DISPATCH`, -DIRTY). Upon returning cleaned, they enter stock as `LAUNDRY_RETURN_RECEIVED` (+CLEAN), completing the loop.</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeSection === "pages" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="1. Summary Dashboard" icon={Activity}>
                            <p className="text-xs text-slate-500 mt-1">The central cockpit for inventory. Displays overall clean ownership, reserved totals, laundry queues, critical low-stock alerts, and aggregate stock ratios.</p>
                        </Card>
                        <Card title="2. Apparel Management" icon={Shirt}>
                            <p className="text-xs text-slate-500 mt-1">The catalog of items. Displays individual item balances (Total, Clean, Dirty, Reserved, In Laundry). Clicking any item navigates to its details page, containing full historical ledger movements and active bookings.</p>
                        </Card>
                        <Card title="3. Purchase Orders" icon={Truck}>
                            <p className="text-xs text-slate-500 mt-1">Manages supplier orders and goods receiving. Lets you approve drafts, record partial or full receipts, specify items arrived damaged, and process returns.</p>
                        </Card>
                        <Card title="4. Event Reservations" icon={Calendar}>
                            <p className="text-xs text-slate-500 mt-1">Handles booking reservations and physical checkout (allotment) of apparel items. Validates stock levels to prevent conflicts before booking holds are confirmed.</p>
                        </Card>
                        <Card title="5. Laundry Operations" icon={Truck}>
                            <p className="text-xs text-slate-500 mt-1">Manages custody transitions with laundry vendors. Dispatches dirty inventory and logs returned clean items, along with any laundry losses or damages.</p>
                        </Card>
                        <Card title="6. Masters Settings" icon={Database}>
                            <p className="text-xs text-slate-500 mt-1">Configures core catalog parameters: Apparel Categories, Unit of Measure definitions, Supplier registries, Laundry Vendor entries, and global system setting overrides.</p>
                        </Card>
                    </div>
                )}

                {activeSection === "guides" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="How to Create a Stock Item" icon={PlusCircle}>
                                <div className="mt-4 text-xs text-slate-600 space-y-2">
                                    <p>1. Navigate to <strong>Inventory &gt; Masters</strong>.</p>
                                    <p>2. Select the <strong>Categories</strong> or <strong>Units</strong> tab to define properties first.</p>
                                    <p>3. Go to the <strong>Apparel Management</strong> page and click <strong>+ New Apparel</strong>.</p>
                                    <p>4. Specify Name, Category, Unit, Unit Value, and Minimum Level.</p>
                                </div>
                            </Card>

                            <Card title="How to Add Stock (Receiving)" icon={Truck}>
                                <div className="mt-4 text-xs text-slate-600 space-y-2">
                                    <p>1. Go to <strong>Inventory &gt; Purchases</strong>.</p>
                                    <p>2. Create a new Purchase Order in <strong>DRAFT</strong> and click <strong>Approve PO</strong>.</p>
                                    <p>3. Once ordered, click <strong>Receive Stock</strong>.</p>
                                    <p>4. Enter clean quantities arrived. If any arrived damaged, enter them in the <strong>Arrived Damaged</strong> field to file them as loss write-offs.</p>
                                </div>
                            </Card>

                            <Card title="How to Trace Stock History" icon={History}>
                                <div className="mt-4 text-xs text-slate-600 space-y-2">
                                    <p>1. Go to <strong>Inventory &gt; Apparels</strong>.</p>
                                    <p>2. Locate your item (e.g. <i>Apareon</i>) and click the **arrow icon** to open Details.</p>
                                    <p>3. Select the <strong>Movements</strong> tab.</p>
                                    <p>4. You will see the entire transaction log, timestamps, quantities, and reference POs or Events.</p>
                                </div>
                            </Card>

                            <Card title="Managing Damages & Recoveries" icon={RotateCcw}>
                                <div className="mt-4 text-xs text-slate-600 space-y-2">
                                    <p>1. Loss movements (MISSING, DAMAGE, PURCHASE_DAMAGE_ON_ARRIVAL) are written off automatically.</p>
                                    <p>2. To recover a loss (e.g. vendor replaces damaged items), open the Apparel's details page.</p>
                                    <p>3. Select the <strong>Loss & Recovery</strong> tab.</p>
                                    <p>4. Locate the item under <strong>Pending Recoveries</strong> and click <strong>Mark Recovered</strong> to add it back to clean stock.</p>
                                </div>
                            </Card>
                        </div>

                        <Card title="Handling Corrections (Ledger Integrity)" icon={AlertTriangle} className="border-amber-100 bg-amber-50/5">
                            <div className="mt-4 text-xs text-slate-600 space-y-3">
                                <p>
                                    Because our system is append-only, you cannot delete a transaction. For example, if you mistakenly allot 
                                    100 items when you only meant to allot 10, the clean stock level will show a shortage (-90).
                                </p>
                                <p className="font-semibold text-slate-800">To fix stock errors:</p>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>If the transaction is active (e.g. an open PO or open Event), you can adjust it on the event page.</li>
                                    <li>For completed transactions, elevate permission to file a **Manual Adjust Positive** or **Manual Adjust Negative** movement.</li>
                                    <li>Provide the exact offset quantity (e.g. +90) and specify a mandatory **Reason** (e.g. "Correction of allotment entry error on Event X") to balance the ledger.</li>
                                </ol>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
