import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { Helper } from './helper';

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
