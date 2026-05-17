import type { IntervalEvent } from './event-base.types';

export function assertValidInterval(event: IntervalEvent): void {
  if (!Number.isFinite(event.startedAt) || !Number.isFinite(event.finishedAt)) {
    throw new TypeError('Interval timestamps must be finite numbers');
  }

  if (event.finishedAt < event.startedAt) {
    throw new RangeError('finishedAt must be greater than or equal to startedAt');
  }
}
