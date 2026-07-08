"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign, Receipt, CreditCard, Scale, RefreshCw, FileSpreadsheet, TrendingUp, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function VendorBillingPortalPage() {
  const portalItems = [
    {
      name: "Rate Contracts",
      description: "Manage laundry service contracts, pricing, and active agreement rates.",
      href: "/inventory/laundry/vendor-billing/rates",
      icon: DollarSign,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      name: "Vendor Invoices",
      description: "Track laundry service invoices, generate bills, and review line item pricing.",
      href: "/inventory/laundry/vendor-billing/invoices",
      icon: Receipt,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      name: "Vendor Payments",
      description: "Record payments made to vendors, issue checks, and track billing ledger history.",
      href: "/inventory/laundry/vendor-billing/payments",
      icon: CreditCard,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      name: "Loss Liabilities",
      description: "Track damage or lost linen liabilities and assign recovery costs to vendors.",
      href: "/inventory/laundry/vendor-billing/liabilities",
      icon: Scale,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      name: "Recovery Credits",
      description: "Reconcile vendor recovery credits, credit notes, and outstanding claims.",
      href: "/inventory/laundry/vendor-billing/credits",
      icon: RefreshCw,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/20",
    },
    {
      name: "Vendor Statements",
      description: "Generate account statements, ledger registers, and transaction reports.",
      href: "/inventory/laundry/vendor-billing/statements",
      icon: FileSpreadsheet,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20",
    },
    {
      name: "Aging Report",
      description: "Analyze outstanding balances, overdue invoices, and aging accounts payable.",
      href: "/inventory/laundry/vendor-billing/aging",
      icon: TrendingUp,
      color: "text-slate-500 bg-slate-50 dark:bg-slate-950/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Vendor Billing & Finance Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a billing module to manage rate contracts, invoices, payments, liabilities, and aging.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {portalItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className="group block">
              <Card className="h-full border hover:border-primary/50 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className={`p-2.5 rounded-lg shrink-0 ${item.color}`}>
                    <Icon size={20} />
                  </div>
                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-primary font-semibold pt-1">
                    <span>Manage Module</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
