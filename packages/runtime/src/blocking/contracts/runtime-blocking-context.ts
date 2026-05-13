import type { RuntimeExecutionContext } from '../../execution/index';

export interface RuntimeBlockingContext {
  readonly execution: RuntimeExecutionContext;

  readonly blockKey: string;

  readonly violationKey: string;
}
