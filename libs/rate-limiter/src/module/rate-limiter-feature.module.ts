import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class RateLimiterFeatureModule {
  static register(): DynamicModule {
    return {
      module: RateLimiterFeatureModule,
    };
  }
}
