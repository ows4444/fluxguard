import { DynamicModule, Module } from '@nestjs/common';

import { RateLimiterRootModule } from './rate-limiter-root.module';

import type { RateLimiterModuleAsyncOptions, RateLimiterModuleOptions } from './rate-limiter.interfaces';

@Module({})
export class RateLimiterModule {
  static forRoot(options: RateLimiterModuleOptions): DynamicModule {
    return {
      module: RateLimiterModule,
      imports: [RateLimiterRootModule.forRoot(options)],
      exports: [RateLimiterRootModule],
    };
  }

  static forRootAsync(options: RateLimiterModuleAsyncOptions): DynamicModule {
    return {
      module: RateLimiterModule,
      imports: [RateLimiterRootModule.forRootAsync(options)],
      exports: [RateLimiterRootModule],
    };
  }
}
