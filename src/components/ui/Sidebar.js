"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Settings,
    Users,
    FileText,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Shield,
    Lock,
    X,
    Shirt,
    Calendar,
    Truck,
    History,
    Box,
    Database,
    Tags,
    Ruler,
    MapPin,
    AlertCircle,
    Building2,
    Hash,
    HelpCircle,
    Sliders,
    BarChart3,
    Receipt,
    CreditCard,
    DollarSign,
    Scale,
    FileSpreadsheet,
    RefreshCw,
    ShoppingBag,
    TrendingUp,
    FolderLock,
    Globe,
    Globe2,
    Smartphone,
    ChefHat,
    Users2
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth/auth-context";
import { useSidebar } from "@/modules/platform/navigation/hooks/use-navigation-designer";

const LucideIcons = {
    LayoutDashboard,
    Settings,
    Users,
    FileText,
    ChevronRight,
    PanelLeftClose,
    PanelLeftOpen,
    Shield,
    Lock,
    X,
    Shirt,
    Calendar,
    Truck,
    History,
    Box,
    Database,
    Tags,
    Ruler,
    MapPin,
    AlertCircle,
    Building2,
    Hash,
    HelpCircle,
    Sliders,
    BarChart3,
    Receipt,
    CreditCard,
    DollarSign,
    Scale,
    FileSpreadsheet,
    RefreshCw,
    ShoppingBag,
    TrendingUp,
    FolderLock,
    Globe,
    Globe2,
    Smartphone,
    ChefHat,
    Users2
};

const isHrefActive = (href, pathname, allNavHrefs) => {
    if (!href) return false;
    if (pathname === href) return true;
    if (!pathname.startsWith(href + '/')) return false;
    const hasMoreSpecificMatch = allNavHrefs.some(other => 
        other !== href && other.length > href.length && (pathname === other || pathname.startsWith(other + '/'))
    );
    return !hasMoreSpecificMatch;
};

function NavItem({ item, collapsed, pathname, expandedMenus, toggleMenu, onNavigate, allNavHrefs, level = 0, siblings = [] }) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.name];
    const isActive = item.href ? isHrefActive(item.href, pathname, allNavHrefs) : false;
    const isChildActive = hasChildren && item.children.some(child => isHrefActive(child.href, pathname, allNavHrefs));

    if (hasChildren) {
        return (
            <>
                <button
                    onClick={() => toggleMenu(item.name, siblings)}
                    className={clsx(
                        "w-full group flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200",
                        isChildActive || isExpanded
                            ? "text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-2"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <item.icon
                            size={20}
                            className={clsx(
                                "transition-colors",
                                isChildActive ? "text-primary" : "group-hover:text-primary"
                            )}
                        />
                        {!collapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
                    </div>
                    {!collapsed && (
                        <ChevronRight
                            size={16}
                            className={clsx(
                                "transition-transform duration-200 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
                                isExpanded && "rotate-90"
                            )}
                        />
                    )}
                </button>
                {isExpanded && !collapsed && (
                    <div className="overflow-hidden flex flex-col gap-1 ml-4 border-l border-sidebar-border pl-2 mr-[5px]">
                        {item.children.map((child) => (
                            <NavItem
                                key={child.name}
                                item={child}
                                collapsed={collapsed}
                                pathname={pathname}
                                expandedMenus={expandedMenus}
                                toggleMenu={toggleMenu}
                                onNavigate={onNavigate}
                                allNavHrefs={allNavHrefs}
                                level={level + 1}
                                siblings={item.children.map(c => c.name)}
                            />
                        ))}
                    </div>
                )}
            </>
        );
    }

    return (
        <Link
            href={item.href || "#"}
            onClick={onNavigate}
            className={clsx(
                "group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
            )}
        >
            <item.icon
                size={20}
                className={clsx(
                    "transition-colors",
                    isActive ? "text-primary-foreground" : "group-hover:text-primary"
                )}
            />
            {!collapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
        </Link>
    );
}

export function Sidebar({ mobileOpen, setMobileOpen }) {
    const [collapsed, setCollapsed] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const pathname = usePathname();
    const { user } = useAuth();
    const { data: sidebarGroups = [] } = useSidebar();

    // Map dynamic groups to expected Sidebar structure
    const dynamicNavItems = useMemo(() => {
        const mapItem = (node) => {
            return {
                name: node.title,
                href: node.route || undefined,
                icon: LucideIcons[node.icon] || Box,
                children: node.children && node.children.length > 0 ? node.children.map(mapItem) : undefined
            };
        };

        return sidebarGroups.map((g) => {
            return {
                name: g.name,
                icon: LucideIcons[g.icon] || FolderLock,
                children: g.items.map(mapItem)
            };
        });
    }, [sidebarGroups]);

    // Flatten all hrefs for active routing highlights checks
    const allNavHrefs = useMemo(() => {
        const extractHrefs = (items) => {
            let hrefs = [];
            for (const item of items) {
                if (item.href) hrefs.push(item.href);
                if (item.children) hrefs = hrefs.concat(extractHrefs(item.children));
            }
            return hrefs;
        };
        return extractHrefs(dynamicNavItems);
    }, [dynamicNavItems]);

    const toggleMenu = (name, siblingNames = []) => {
        setExpandedMenus(prev => {
            const isAlreadyExpanded = prev[name];
            if (isAlreadyExpanded) {
                const next = { ...prev };
                delete next[name];
                return next;
            }
            // Keep all expanded menus, close only siblings at this level, then open this one
            const next = { ...prev };
            for (const sibling of siblingNames) {
                if (sibling !== name) delete next[sibling];
            }
            next[name] = true;
            return next;
        });
    };

    // Auto-expand menu based on current pathname
    useEffect(() => {
        const expandForPathname = (items, acc = {}) => {
            for (const item of items) {
                if (item.children) {
                    const childMatch = item.children.some(child =>
                        child.href ? isHrefActive(child.href, pathname, allNavHrefs) : false
                    );
                    if (childMatch) acc[item.name] = true;
                    expandForPathname(item.children, acc);
                }
            }
            return acc;
        };
        const toExpand = expandForPathname(dynamicNavItems);
        if (Object.keys(toExpand).length > 0) {
            setExpandedMenus(prev => ({ ...prev, ...toExpand }));
        }
    }, [pathname, dynamicNavItems, allNavHrefs]);

    const handleMobileNavigate = () => {
        if (setMobileOpen) {
            setMobileOpen(false);
        }
    };

    useEffect(() => {
        if (setMobileOpen) {
            setMobileOpen(false);
        }
    }, [pathname, setMobileOpen]);

    const sidebarContent = (
        <>
            <div className={clsx(
                "border-b border-sidebar-border",
                collapsed ? "flex flex-col items-center py-3 px-2 gap-2" : "h-16 flex items-center justify-between px-4"
            )}>
                <div className={clsx(
                    "flex items-center gap-2.5",
                    collapsed ? "justify-center" : "min-w-0"
                )}>
                    <Image
                        src="/logo.png"
                        alt="Varity Systems"
                        width={28}
                        height={28}
                        className="shrink-0 rounded"
                    />
                    {!collapsed && (
                        <span className="text-lg font-bold text-sidebar-foreground truncate tracking-tight">
                            Varity Systems
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors hidden lg:block"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
                {setMobileOpen && (
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors ml-auto lg:hidden"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
                {dynamicNavItems.map((item) => (
                    <NavItem
                        key={item.name}
                        item={item}
                        collapsed={collapsed}
                        pathname={pathname}
                        expandedMenus={expandedMenus}
                        toggleMenu={toggleMenu}
                        onNavigate={handleMobileNavigate}
                        allNavHrefs={allNavHrefs}
                        siblings={dynamicNavItems.map(i => i.name)}
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <div
                    className={clsx(
                        "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer",
                        collapsed ? "justify-center" : ""
                    )}
                >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                        {user?.fullName ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate text-sidebar-foreground">{user?.fullName || "User"}</span>
                            <span className="text-xs text-sidebar-foreground/60 truncate">
                                {user?.email}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <>
            <aside
                className={clsx(
                    "hidden lg:flex flex-col h-full z-40 transition-all duration-300",
                    "bg-sidebar border-r border-sidebar-border",
                    collapsed ? "w-20" : "w-64"
                )}
            >
                {sidebarContent}
            </aside>

            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={clsx(
                    "fixed top-0 left-0 h-full z-50 lg:hidden transition-transform duration-300 ease-in-out",
                    "bg-sidebar border-r border-sidebar-border shadow-2xl",
                    "w-64 flex flex-col",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
