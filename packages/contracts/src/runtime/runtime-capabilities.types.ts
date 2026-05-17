export interface RuntimeCapabilities {
  /**
   * consistentPeek requires:
   * - singleProcessSerializedConsumption
   */
  readonly consistentPeek: boolean;

  /**
   * strongConsistency implies:
   * - singleProcessSerializedConsumption
   * - authoritative distributed coordination
   */
  readonly strongConsistency: boolean;

  readonly adjustments: boolean;

  readonly distributed: boolean;

  /**
   * Guarantees serialized mutation ordering only
   * within a single synchronous JavaScript runtime.
   *
   * This does NOT imply:
   * - distributed atomicity
   * - transactional durability
   * - multi-process coordination
   * - worker thread synchronization
   */
  readonly singleProcessSerializedConsumption: boolean;
}
