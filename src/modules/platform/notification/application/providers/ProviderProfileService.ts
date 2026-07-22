/**
 * EWP-005 Application Service — ProviderProfileService
 * Governed by CC-005, ES-008, ES-009, ES-010
 */

import { IProviderProfileRepository } from "../../domain/providers/IProviderProfileRepository";
import { CreateProviderProfileProps, ProviderHealthStatus, ProviderProfile } from "../../domain/providers/ProviderProfile";
import { DuplicateProviderCodeException, ProviderProfileNotFoundError } from "../../domain/providers/ProviderProfileErrors";
import { IDomainEvent } from "../../domain/providers/ProviderProfileEvents";

export class ProviderProfileService {
  private publishedEvents: IDomainEvent[] = [];

  constructor(private readonly repository: IProviderProfileRepository) {}

  public getPublishedEvents(): IDomainEvent[] {
    return [...this.publishedEvents];
  }

  public clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  async registerProvider(
    props: CreateProviderProfileProps,
    actorId?: string
  ): Promise<ProviderProfile> {
    const exists = await this.repository.existsProviderCode(props.tenantId, props.providerCode);
    if (exists) {
      throw new DuplicateProviderCodeException(props.tenantId, props.providerCode);
    }

    const provider = ProviderProfile.create({
      ...props,
      createdBy: actorId || props.createdBy,
      updatedBy: actorId || props.updatedBy,
    });

    await this.repository.save(provider);
    this.dispatchEvents(provider);

    if (props.isDefault && props.supportedChannels.length > 0) {
      for (const channelId of props.supportedChannels) {
        await this.repository.clearOtherDefaults(provider.tenantId, channelId, provider.id);
      }
    }

    return provider;
  }

  async enableProvider(
    providerId: string,
    tenantId: string,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.enable(actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async disableProvider(
    providerId: string,
    tenantId: string,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.disable(actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async retireProvider(
    providerId: string,
    tenantId: string,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.retire(actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async updateHealthStatus(
    providerId: string,
    tenantId: string,
    healthStatus: ProviderHealthStatus,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.updateHealthStatus(healthStatus, actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async setDefault(
    providerId: string,
    tenantId: string,
    channelId: string,
    isDefault: boolean,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.setDefault(isDefault, channelId, actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);

    if (isDefault) {
      await this.repository.clearOtherDefaults(tenantId, channelId, providerId);
    }

    return provider;
  }

  async setPriority(
    providerId: string,
    tenantId: string,
    priority: number,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.setPriority(priority, actorId);
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async updateMetadata(
    providerId: string,
    tenantId: string,
    providerName?: string,
    description?: string | null,
    capabilityMetadata?: Record<string, any>,
    configurationMetadata?: Record<string, any> | null,
    actorId?: string
  ): Promise<ProviderProfile> {
    const provider = await this.repository.findById(providerId, tenantId);
    if (!provider) throw new ProviderProfileNotFoundError(providerId);

    provider.updateMetadata(
      providerName,
      description,
      capabilityMetadata,
      configurationMetadata,
      actorId
    );
    await this.repository.save(provider);
    this.dispatchEvents(provider);
    return provider;
  }

  async getById(id: string, tenantId: string): Promise<ProviderProfile | null> {
    return this.repository.findById(id, tenantId);
  }

  async getByCode(tenantId: string, providerCode: string): Promise<ProviderProfile | null> {
    return this.repository.findByCode(tenantId, providerCode);
  }

  async getDefaultProvider(tenantId: string, channelId: string): Promise<ProviderProfile | null> {
    return this.repository.findDefaultProvider(tenantId, channelId);
  }

  async listEnabledProviders(tenantId: string): Promise<ProviderProfile[]> {
    return this.repository.listEnabledProviders(tenantId);
  }

  async listHealthyProviders(tenantId: string): Promise<ProviderProfile[]> {
    return this.repository.listHealthyProviders(tenantId);
  }

  async listByChannel(tenantId: string, channelId: string): Promise<ProviderProfile[]> {
    return this.repository.listByChannel(tenantId, channelId);
  }

  private dispatchEvents(aggregate: ProviderProfile): void {
    const events = aggregate.popDomainEvents();
    // Enforce strict FIFO ordering upon transaction commit (AR-007)
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }
}
