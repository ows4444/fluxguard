import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from '@nestjs/config';
import { RateLimiterModule } from '@lib/rate-limiter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RateLimiterModule.forRoot({
      limiters: { a: { duration: 1, kind: 'cooldown' } },
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
