export interface RuntimeStoreCapabilities {
  readonly atomicFixedWindow: boolean;

  readonly gcra: boolean;

  readonly burst: boolean;

  readonly progressiveBlocking: boolean;

  readonly adjustments: boolean;

  readonly peek: boolean;

  readonly distributedTime: boolean;
}
