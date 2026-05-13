export interface RuntimeClock {
  now(): Promise<number>;
}
