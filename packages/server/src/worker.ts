/**
 * キュー処理のためのワーカー (NestJS アプリケーション) を起動するためのスクリプト
 */

import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

// ソースマップの対応 (コンソールのスタックトレースへ .ts ファイルの行数を表示)
import 'source-map-support/register';

async function bootstrap() {
  const app = await NestFactory.create(WorkerAppModule);
  app.init();
}
bootstrap();
