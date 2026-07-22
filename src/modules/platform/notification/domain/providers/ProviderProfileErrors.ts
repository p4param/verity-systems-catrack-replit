/**
 * EWP-005 Domain Errors — ProviderProfile
 * Governed by CC-005, ES-008, ES-010
 */

export class ProviderProfileException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderProfileException";
  }
}

export class DuplicateProviderCodeException extends ProviderProfileException {
  constructor(tenantId: string, providerCode: string) {
    super(`Provider code '${providerCode}' already exists within tenant ${tenantId}`);
    this.name = "DuplicateProviderCodeException";
  }
}

export class InvalidProviderStateTransitionException extends ProviderProfileException {
  constructor(fromState: string, toState: string) {
    super(`Invalid provider lifecycle state transition from '${fromState}' to '${toState}'`);
    this.name = "InvalidProviderStateTransitionException";
  }
}

export class ProviderRetiredException extends ProviderProfileException {
  constructor(providerId: string) {
    super(`Provider profile ${providerId} is RETIRED and cannot accept state or configuration mutations`);
    this.name = "ProviderRetiredException";
  }
}

export class ProviderProfileNotFoundError extends ProviderProfileException {
  constructor(providerId: string) {
    super(`Provider profile ${providerId} was not found`);
    this.name = "ProviderProfileNotFoundError";
  }
}
