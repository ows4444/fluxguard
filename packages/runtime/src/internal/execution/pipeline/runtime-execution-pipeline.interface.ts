import type { ConsumeResult, PeekResult } from '@fluxguard/contracts';

import type { RuntimeExecutionContext } from '../runtime-execution-context';

export interface RuntimeExecutionPipeline {
  consume(context: RuntimeExecutionContext): Promise<ConsumeResult>;

  peek(context: RuntimeExecutionContext): Promise<PeekResult>;
}
