import { RuntimeEngine, type RuntimeStore } from '@fluxguard/runtime';
import { type DynamicModule, Module } from '@nestjs/common';

import { FLUXGUARD_RUNTIME } from '../constants/injection-tokens';
import { RateLimitGuard } from '../guards/rate-limit.guard';

export interface FluxguardModuleOptions {
  readonly storage: RuntimeStore;
}

@Module({})
export class FluxguardModule {
  static forRoot(options: FluxguardModuleOptions): DynamicModule {
    const runtime = new RuntimeEngine({
      storage: options.storage,
    });

    return {
      module: FluxguardModule,

      providers: [
        {
          provide: FLUXGUARD_RUNTIME,
          useValue: runtime,
        },

        RateLimitGuard,
      ],

      exports: [FLUXGUARD_RUNTIME, RateLimitGuard],
    };
  }
}
