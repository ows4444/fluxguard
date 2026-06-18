export interface ShadowEvaluationPolicy {
  shouldEvaluate(): boolean;
}

export class AlwaysEvaluateShadowPolicy implements ShadowEvaluationPolicy {
  shouldEvaluate(): boolean {
    return true;
  }
}
