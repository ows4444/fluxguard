export interface ShadowEvaluationBudget {
  readonly timeoutMs: number;
}

export const DEFAULT_SHADOW_EVALUATION_BUDGET: ShadowEvaluationBudget = Object.freeze({
  timeoutMs: 1000,
});
