/**
 * EWP-005 Domain Repository Interface — ProviderProfile
 * Governed by CC-005, ES-001, ES-009
 */

import { ProviderProfile } from "./ProviderProfile";

export interface IProviderProfileRepository {
  findById(id: string, tenantId: string): Promise<ProviderProfile | null>;
  findByCode(tenantId: string, providerCode: string): Promise<ProviderProfile | null>;
  findDefaultProvider(tenantId: string, channelId: string): Promise<ProviderProfile | null>;
  listEnabledProviders(tenantId: string): Promise<ProviderProfile[]>;
  listHealthyProviders(tenantId: string): Promise<ProviderProfile[]>;
  listByChannel(tenantId: string, channelId: string): Promise<ProviderProfile[]>;
  existsProviderCode(tenantId: string, providerCode: string): Promise<boolean>;
  save(provider: ProviderProfile): Promise<void>;
  clearOtherDefaults(tenantId: string, channelId: string, excludeProviderId: string): Promise<void>;
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;
}
