/**
 * キュー処理のためのワーカー (NestJS アプリケーション) を起動するためのスクリプト
 */

import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

async function bootstrap() {
  const app = await NestFactory.create(WorkerAppModule);
  app.init();
}
bootstrap();
