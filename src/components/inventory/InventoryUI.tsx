import React from "react";
import { clsx } from "clsx";

export function Card({ title, value, icon: Icon, trend, trendType = "neutral", children, className }: {
    title?: any;
    value?: any;
    icon?: any;
    trend?: any;
    trendType?: string;
    children?: any;
    className?: any;
}) {
    return (
        <div className={clsx(
            "p-5 rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md",
            className
        )}>
            {title && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                    {Icon && <Icon className="text-primary" size={20} />}
                </div>
            )}
            {value !== undefined && (
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-2xl font-bold">{value}</span>
                        {trend && (
                            <span className={clsx(
                                "ml-2 text-xs font-semibold px-2 py-0.5 rounded-full",
                                trendType === "positive" ? "bg-green-100 text-green-700" :
                                    trendType === "negative" ? "bg-red-100 text-red-700" :
                                        "bg-muted text-foreground"
                            )}>
                                {trend}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}

export function StatusBadge({ type, children }) {
    const styles = {
        success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        danger: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        neutral: "bg-muted/500/10 text-slate-600 border-slate-500/20",
    };

    return (
        <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
            styles[type] || styles.neutral
        )}>
            {children}
        </span>
    );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={clsx("bg-card w-full rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200", maxWidth)}>
                <div className="flex items-center justify-between p-6 border-b border-border bg-muted/50/50">
                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-200/50 text-muted-foreground transition-colors"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
