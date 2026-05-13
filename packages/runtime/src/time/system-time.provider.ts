export interface TimeProvider {
  now(): number;
}

export class SystemTimeProvider implements TimeProvider {
  now(): number {
    return Date.now();
  }
}
