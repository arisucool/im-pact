import { Module } from '@nestjs/common';
import { Helper } from './helper';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { InitializationService } from './initialization.service';
import { TopicsModule } from './topics/topics.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';

@Module({
  imports: [
    // データベースへ接続するための設定
    TypeOrmModule.forRoot(Helper.getDBSettings()),
    // 本番環境にて Angular アプリケーション (../../client/dist/client/) を静的ファイルとしてサーブするための設定
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client', 'dist', 'client'),
    }),
    // 各モジュール
    UsersModule,
    AuthModule,
    TopicsModule,
    SocialAccountsModule,
  ],
  controllers: [AppController],
  providers: [AppService, InitializationService],
})
export class AppModule {}
