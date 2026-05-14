import { burstAdjustIdempotentScript } from './adjustments/burst-adjust-idempotent.lua';
import { fixedWindowAdjustIdempotentScript } from './adjustments/fixed-window-adjust-idempotent.lua';
import { burstConsumeScript } from './burst/burst-consume.lua';
import { burstPeekScript } from './burst/burst-peek.lua';
import { fixedWindowAtomicConsumeScript } from './fixed-window/fixed-window-atomic-consume.lua';
import { fixedWindowBlockingConsumeScript } from './fixed-window/fixed-window-blocking-consume.lua';
import { fixedWindowPeekScript } from './fixed-window/fixed-window-peek.lua';
import { fixedWindowProgressiveBlockingScript } from './fixed-window/fixed-window-progressive-blocking.lua';
import { gcraConsumeScript } from './gcra/gcra-consume.lua';
import { gcraPeekScript } from './gcra/gcra-peek.lua';
import { redisTimeScript } from './system/redis-time.lua';

export const runtimeLuaScripts = Object.freeze([
  gcraConsumeScript,

  fixedWindowAtomicConsumeScript,

  fixedWindowBlockingConsumeScript,

  fixedWindowProgressiveBlockingScript,

  burstConsumeScript,

  fixedWindowAdjustIdempotentScript,

  burstAdjustIdempotentScript,

  redisTimeScript,

  burstPeekScript,

  fixedWindowPeekScript,

  gcraPeekScript,
]);
