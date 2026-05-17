declare const secondsBrand: unique symbol;
declare const durationMillisecondsBrand: unique symbol;
declare const monotonicTimestampMsBrand: unique symbol;
declare const unixTimestampMsBrand: unique symbol;

export type Seconds = number & { readonly [secondsBrand]: 'Seconds' };
export type DurationMilliseconds = number & { readonly [durationMillisecondsBrand]: 'DurationMilliseconds' };
export type MonotonicTimestampMs = number & { readonly [monotonicTimestampMsBrand]: 'MonotonicTimestampMs' };
export type UnixTimestampMs = number & { readonly [unixTimestampMsBrand]: 'UnixTimestampMs' };
