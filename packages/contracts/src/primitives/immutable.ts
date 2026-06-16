import { deepFreeze } from './deep-freeze';

export type Primitive = string | number | boolean | bigint | symbol | undefined | null;

export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends (...args: unknown[]) => unknown
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends Promise<infer P>
          ? Promise<DeepReadonly<P>>
          : T extends readonly (infer U)[]
            ? readonly DeepReadonly<U>[]
            : T extends object
              ? {
                  readonly [K in keyof T]: DeepReadonly<T[K]>;
                }
              : T;

export type Immutable<T> = DeepReadonly<T>;

export function immutable<T extends object>(value: T): DeepReadonly<T> {
  return deepFreeze<T>(value);
}
