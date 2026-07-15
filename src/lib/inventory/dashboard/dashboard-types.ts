// ============================================================================
// Executive Dashboard — TypeScript Types & DTOs
// ============================================================================

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RecommendationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RecommendationType =
    | "REORDER"
    | "LAUNDRY"
    | "VENDOR"
    | "LOSS"
    | "CAPACITY"
    | "GENERAL";
export type RecommendationStatus = "ACTIVE" | "DISMISSED" | "RESOLVED";

// ─── Section 1: Inventory Summary ────────────────────────────────────────────

export interface InventorySummaryDTO {
    totalPhysicalInventory: number;
    availableInventory: number;
    reservedInventory: number;
    dirtyInventory: number;
    inLaundryInventory: number;
    /** Placeholder for V2 valuation module */
    inventoryValue: number;
}

// ─── Section 2: Inventory Health Score ───────────────────────────────────────

export interface InventoryHealthDTO {
    /** Composite score 0–100 */
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    components: {
        availability: number;   // 30% weight — score 0-100
        stockoutRisk: number;  // 25% weight — score 0-100
        dirtyRatio: number;    // 20% weight — score 0-100
        lossRatio: number;     // 15% weight — score 0-100
        aging: number;         // 10% weight — score 0-100
    };
}

// ─── Section 3: Demand Forecast ──────────────────────────────────────────────

export interface DemandForecastDTO {
    predictedDemand30Days: number;
    forecastAccuracy: number;          // Percentage 0-100
    predictedPurchaseRequirement: number;
    stockoutRisk: RiskLevel;
    /** V2 placeholder note */
    note: string;
}

// ─── Section 4: Event KPIs ───────────────────────────────────────────────────

export interface EventMetricsDTO {
    upcomingEvents: number;
    eventsThisMonth: number;
    eventCompletionRate: number;       // Percentage 0-100
    eventsPendingReconciliation: number;
}

// ─── Section 5: Loss & Recovery ──────────────────────────────────────────────

export interface LossMetricsDTO {
    /** Sum of MISSING + DAMAGE movements (absolute value) */
    grossLoss: number;
    /** Sum of RECOVERY movements */
    recovered: number;
    /** grossLoss - recovered */
    netLoss: number;
    /** netLoss / totalEventAllotment — as percentage */
    lossRate: number;
    /** recovered / grossLoss — as percentage */
    recoveryRate: number;
    /** Placeholder for V2 */
    financialImpact: number;
}

// ─── Section 6: Vendor KPIs ──────────────────────────────────────────────────

export interface VendorPerformanceEntry {
    vendorId: number;
    vendorName: string;
    score: number;
    totalDispatched: number;
    totalReturned: number;
    avgTurnaroundDays: number;
    riskLevel: RiskLevel;
}

export interface VendorMetricsDTO {
    overallScore: number;
    highRiskVendorCount: number;
    averageTurnaroundDays: number;
    /** Placeholder for V2 */
    vendorLiability: number;
    topVendors: VendorPerformanceEntry[];
    bottomVendors: VendorPerformanceEntry[];
}

// ─── Section 7: Laundry KPIs ─────────────────────────────────────────────────

export interface LaundryAgingBuckets {
    /** Orders 0–3 days in laundry */
    within3Days: number;
    /** Orders 4–7 days in laundry */
    within7Days: number;
    /** Orders > 7 days in laundry */
    over7Days: number;
}

export interface LaundryMetricsDTO {
    dirtyStockQty: number;
    inLaundryQty: number;
    agingBuckets: LaundryAgingBuckets;
    avgCycleDays: number;
    delayedOrders: number;
}

// ─── Section 8: Asset Utilization ────────────────────────────────────────────

export interface AssetUtilizationEntry {
    apparelId: number;
    apparelName: string;
    category: string;
    availableQty: number;
    allottedQty: number;
    /** allottedQty / availableQty — as percentage */
    utilizationRate: number;
}

export interface UtilizationMetricsDTO {
    topUtilized: AssetUtilizationEntry[];
    underUtilized: AssetUtilizationEntry[];
    overallUtilizationRate: number;
}

// ─── Section 9: Risk Dashboard ───────────────────────────────────────────────

export interface RiskMetricsDTO {
    stockoutRisk: RiskLevel;
    vendorRisk: RiskLevel;
    laundryBottleneck: RiskLevel;
    eventCapacityRisk: RiskLevel;
    /** Composite risk summary */
    overallRiskLevel: RiskLevel;
}

// ─── Section 10: Financial KPIs ──────────────────────────────────────────────

export interface FinancialMetricsDTO {
    /** Placeholder — returns 0 until valuation module */
    inventoryValue: number;
    monthlyConsumptionValue: number;
    costOfLosses: number;
    costOfDamages: number;
    recoverySavings: number;
    note: string;
}

// ─── Section 11: AI Recommendations ─────────────────────────────────────────

export interface AIRecommendationDTO {
    id: string;
    priority: RecommendationPriority;
    type: RecommendationType;
    title: string;
    description: string;
    payload?: Record<string, unknown>;
    createdAt: string;
}

// ─── Full Executive Dashboard Response ───────────────────────────────────────

export interface ExecutiveDashboardResponse {
    /** ISO timestamp of the snapshot this data was generated from */
    snapshotDate: string;
    /** Whether data is from a pre-computed snapshot (fast) or live query (slower) */
    dataSource: "SNAPSHOT" | "LIVE";
    summary: InventorySummaryDTO;
    inventoryHealth: InventoryHealthDTO;
    demandForecast: DemandForecastDTO;
    eventMetrics: EventMetricsDTO;
    lossMetrics: LossMetricsDTO;
    vendorMetrics: VendorMetricsDTO;
    laundryMetrics: LaundryMetricsDTO;
    utilizationMetrics: UtilizationMetricsDTO;
    riskMetrics: RiskMetricsDTO;
    financialMetrics: FinancialMetricsDTO;
    recommendations: AIRecommendationDTO[];
}

// ─── Trend Response ───────────────────────────────────────────────────────────

export interface TrendDataPoint {
    date: string;
    value: number;
}

export interface TrendSeriesDTO {
    metricCode: string;
    dataPoints: TrendDataPoint[];
}

export interface TrendsResponse {
    fromDate: string;
    toDate: string;
    series: TrendSeriesDTO[];
}

// ─── KPI Metric Codes ─────────────────────────────────────────────────────────

export const KPI_METRIC_CODES = {
    INVENTORY_HEALTH: "INVENTORY_HEALTH",
    AVAILABLE_INVENTORY: "AVAILABLE_INVENTORY",
    DIRTY_INVENTORY: "DIRTY_INVENTORY",
    NET_LOSS: "NET_LOSS",
    RECOVERY_RATE: "RECOVERY_RATE",
    VENDOR_SCORE: "VENDOR_SCORE",
    DELAYED_LAUNDRY: "DELAYED_LAUNDRY",
    GROSS_LOSS: "GROSS_LOSS",
    LOSS_RATE: "LOSS_RATE",
    EVENT_COMPLETION_RATE: "EVENT_COMPLETION_RATE",
    IN_LAUNDRY_QTY: "IN_LAUNDRY_QTY",
} as const;

export type KPIMetricCode = typeof KPI_METRIC_CODES[keyof typeof KPI_METRIC_CODES];

