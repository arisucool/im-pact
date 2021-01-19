import { Module } from '@nestjs/common';
import { Helper } from './helper';

import { BullModule } from '@nestjs/bull';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsWorkerModule } from './topics/topics-worker.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';

/**
 * キュー処理のためのワーカーのアプリケーションモジュール
 * (./worker.ts から呼び出される)
 */
@Module({
  imports: [
    // データベースへ接続するための設定
    TypeOrmModule.forRoot(Helper.getDBSettings(false)),
    // Redis データベースによるキューへ接続するための設定
    BullModule.forRoot({
      redis: Helper.getRedisSettings(),
      prefix: 'bull',
    }),
    // キュー処理のためのモジュールのインポート
    TopicsWorkerModule,
  ],
  controllers: [],
  providers: [],
})
export class WorkerAppModule {}
