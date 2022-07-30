/**
 * バックエンドサーバ (NestJS アプリケーション) を起動するためのスクリプト
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

import * as dotenv from 'dotenv';
dotenv.config({
  path: `${__dirname}/../.env`,
});

import { AppModule } from './app.module';
import { Helper } from './helper';

// ソースマップの対応 (コンソールのスタックトレースへ .ts ファイルの行数を表示)
import 'source-map-support/register';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // URLのプレフィックスが /api となるように設定
  app.setGlobalPrefix('api');

  // リクエストの容量制限を緩和
  app.use(bodyParser.json({ limit: '5mb' }));

  // Swagger による OpenAPI の対応 (/api/docs/ にてドキュメントを公開)
  const document = Helper.generateAPIDocument(app);
  SwaggerModule.setup('api/docs', app, document);

  // サーバの待ち受けを開始
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
