export interface RuntimeStoreCapabilities {
  readonly atomicFixedWindow: boolean;

  readonly gcra: boolean;

  readonly burst: boolean;

  readonly progressiveBlocking: boolean;

  readonly distributedTime: boolean;

  readonly adjustments: {
    readonly fixedWindow: boolean;

    readonly burst: boolean;
  };

  readonly peek: {
    readonly fixedWindow: boolean;

    readonly burst: boolean;

    readonly gcra: boolean;
  };
}
