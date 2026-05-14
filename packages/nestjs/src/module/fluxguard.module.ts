import { RuntimeEngine, type RuntimeStore } from '@fluxguard/runtime';
import { type DynamicModule, Module } from '@nestjs/common';

import { FLUXGUARD_CONTEXT_EXTRACTOR, FLUXGUARD_RUNTIME } from '../constants/injection-tokens';
import { RequestContextExtractor } from '../context/request-context.extractor';
import { RateLimitGuard } from '../guards/rate-limit.guard';

export interface FluxguardModuleOptions {
  readonly storage: RuntimeStore;
}

@Module({})
export class FluxguardModule {
  static forRoot(options: FluxguardModuleOptions): DynamicModule {
    return {
      module: FluxguardModule,

      providers: [
        {
          provide: FLUXGUARD_RUNTIME,
          useFactory: () => new RuntimeEngine({ storage: options.storage }),
        },

        {
          provide: FLUXGUARD_CONTEXT_EXTRACTOR,
          useClass: RequestContextExtractor,
        },

        RateLimitGuard,
      ],

      exports: [FLUXGUARD_RUNTIME, RateLimitGuard],
    };
  }
}
