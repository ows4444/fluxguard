export interface CounterRecord {
  readonly value: number;

  readonly expiresAt: number;
}

export interface TokenBucketRecord {
  readonly tokens: number;

  readonly lastRefillAt: number;

  readonly expiresAt: number;
}

export interface GcraRecord {
  readonly theoreticalArrivalTime: number;

  readonly expiresAt: number;
}

export interface CooldownRecord {
  readonly active: boolean;

  readonly expiresAt: number;
}

export interface BlockRecord {
  readonly blocked: boolean;

  readonly expiresAt: number;

  readonly reason?: string;
}

export interface ViolationRecord {
  readonly violations: number;

  readonly expiresAt: number;
}
