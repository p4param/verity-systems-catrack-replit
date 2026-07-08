"use client";

import { GitBranch } from "lucide-react";

const CURRENCIES = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
];

export default function CurrenciesPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <GitBranch size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Currencies</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Currencies available for event budgets and payments.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>System-managed:</strong> Currency list is predefined. INR is the default system currency.
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currency Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {CURRENCIES.map((cur) => (
              <tr key={cur.code} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3.5">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-primary/10 text-primary rounded-lg border border-primary/20">
                    {cur.code}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm font-medium text-foreground">{cur.name}</td>
                <td className="px-6 py-3.5 text-lg font-bold text-muted-foreground">{cur.symbol}</td>
                <td className="px-6 py-3.5">
                  {cur.code === "INR" ? (
                    <span className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200">Default</span>
                  ) : (
                    <span className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-500 font-medium border border-slate-200">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">{CURRENCIES.length} currencies configured</p>
        </div>
      </div>
    </div>
  );
}
