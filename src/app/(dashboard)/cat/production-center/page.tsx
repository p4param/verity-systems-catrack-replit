import { ProductionCenterWorkspace } from '@/modules/cat/production-center/components/ProductionCenterWorkspace';

// EM-WP10A — Production Center. Standalone Operations workspace — not
// nested under an Event. Consolidates EM-WP10's Ingredient Demand across
// every Event sharing a Work Date.
export default function ProductionCenterPage() {
  return <ProductionCenterWorkspace />;
}
