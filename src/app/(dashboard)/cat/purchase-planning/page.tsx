import { PurchasePlanningWorkspace } from '@/modules/cat/purchase-planning/components/PurchasePlanningWorkspace';

// PM-WP02 — Purchase Planning. Standalone Operations workspace — not
// nested under an Event or Vendor. Recommends, for every ingredient in
// Production Center's Consolidated Ingredient Demand on a Work Date,
// which Vendor from Vendor Master's Supply Portfolio should supply it.
export default function PurchasePlanningPage() {
  return <PurchasePlanningWorkspace />;
}
