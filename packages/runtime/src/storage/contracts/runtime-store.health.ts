export interface RuntimeStoreHealth {
  readonly healthy: boolean;

  readonly degraded?: boolean;

  readonly latencyMs?: number;

  readonly reason?: string;
}

export interface RuntimeHealthCapability {
  health(): Promise<RuntimeStoreHealth>;
}
