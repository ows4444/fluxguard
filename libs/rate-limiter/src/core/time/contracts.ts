export interface DistributedTimeSource {
  nowMs(): Promise<number>;
}

export interface MonotonicTimeSource {
  nowMs(): number;
}
