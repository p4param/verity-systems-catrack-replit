import { randomUUID } from "crypto";

export interface RuntimeTransactionInit {
  id?: string;
  parentTransactionId?: string;
  startedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class RuntimeTransaction {
  readonly id: string;
  readonly parentTransactionId?: string;
  readonly startedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;

  private constructor(init: RuntimeTransactionInit) {
    this.id = init.id ?? randomUUID();
    this.parentTransactionId = init.parentTransactionId;
    this.startedAt = init.startedAt ?? new Date();
    this.metadata = Object.freeze({ ...(init.metadata ?? {}) });

    Object.freeze(this);
  }

  static create(init: RuntimeTransactionInit = {}): RuntimeTransaction {
    return new RuntimeTransaction(init);
  }
}
