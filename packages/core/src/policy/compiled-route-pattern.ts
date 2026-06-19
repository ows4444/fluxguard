export interface CompiledRoutePattern {
  readonly original: string;

  readonly segments: readonly string[];

  readonly trailingWildcard: boolean;
}

export function compileRoutePattern(pattern: string): CompiledRoutePattern {
  return {
    original: pattern,
    segments: pattern.split('/'),
    trailingWildcard: pattern.endsWith('/**'),
  };
}
