import { RuntimeDesignSystem as DesignSystemType } from "../types/framework";

export const RuntimeDesignSystem: DesignSystemType = {
  spacing: {
    tabGap: "gap-2",
    tabListPadding: "p-1 bg-muted/30 rounded-lg",
    sectionGap: "space-y-6",
    sectionPadding: "p-6",
    sectionHeaderPadding: "px-5 py-4",
    groupSpacing: "space-y-6",
    rowGap: "gap-4",
    fieldGap: "space-y-2",
    footerPadding: "py-4 px-6",
    toolbarPadding: "pb-4 mb-4 border-b border-border",
    pagePadding: "p-6 space-y-6",
  },
  typography: {
    pageTitle: "text-2xl font-bold tracking-tight text-foreground",
    breadcrumb: "text-xs text-muted-foreground hover:text-foreground transition-colors",
    tabLabel: "text-sm font-medium",
    sectionTitle: "text-sm font-bold text-foreground tracking-tight",
    fieldLabel: "text-xs font-semibold text-muted-foreground/80",
    fieldHelp: "text-xs text-muted-foreground mt-1 block leading-relaxed",
    fieldError: "text-xs font-medium text-rose-500 mt-1 block",
    footerText: "text-xs text-muted-foreground",
  },
  colors: {
    requiredAsterisk: "text-rose-500 font-bold",
    validationSummaryBg: "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-400",
    sectionHeaderBg: "bg-muted/10 border-b border-border",
    cardBg: "bg-card border border-border rounded-xl shadow-sm",
    stickyFooterBg: "bg-background/80 backdrop-blur-md border-t border-border shadow-md",
  },
  borders: {
    input: "border border-input rounded-lg",
    button: "rounded-lg border border-border",
    card: "border border-border rounded-xl",
  },
  shadows: {
    card: "shadow-sm",
    footer: "shadow-md",
    popover: "shadow-lg",
  },
  animations: {
    collapse: "transition-all duration-200 ease-in-out",
    hover: "transition-colors duration-150 ease-in-out",
  },
  components: {
    inputRadius: "rounded-lg",
    buttonRadius: "rounded-lg",
  },
  density: {
    COMPACT: {
      tabGap: "gap-1",
      sectionGap: "space-y-4",
      sectionPadding: "p-4",
      groupSpacing: "space-y-4",
      rowGap: "gap-3",
      fieldGap: "space-y-1.5",
      pagePadding: "p-4 space-y-4",
    },
    COMFORTABLE: {
      tabGap: "gap-2",
      sectionGap: "space-y-6",
      sectionPadding: "p-6",
      groupSpacing: "space-y-6",
      rowGap: "gap-4",
      fieldGap: "space-y-2",
      pagePadding: "p-6 space-y-6",
    },
    RELAXED: {
      tabGap: "gap-3",
      sectionGap: "space-y-8",
      sectionPadding: "p-8",
      groupSpacing: "space-y-8",
      rowGap: "gap-5",
      fieldGap: "space-y-2.5",
      pagePadding: "p-8 space-y-8",
    },
  },
};
export default RuntimeDesignSystem;
