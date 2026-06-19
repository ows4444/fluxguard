type AlgorithmStateValue =
  | string
  | number
  | boolean
  | null
  | readonly AlgorithmStateValue[]
  | { readonly [key: string]: AlgorithmStateValue };

export type AlgorithmState = Readonly<Record<string, AlgorithmStateValue>>;
