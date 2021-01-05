import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module'
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // URLのプレフィックスが /api となるように設定
  app.setGlobalPrefix('api');

  // リクエストの容量制限を緩和
  app.use(bodyParser.json({limit: '5mb'}));

  // アプリケーション名の取得
  let package_name = null, package_version = null;
  try {
    const package_json = require(`${__dirname}/../../../package.json`);
    package_name = package_json.name;
    package_version = package_version = package_json.version;
  } catch (e) {}
  
  // ドキュメント情報の設定
  let doc_app_name = null, doc_app_description = null, doc_app_version = 'x.x.x';
  if (!package_name || package_name === 'im-pact') {
    doc_app_name = 'im pact';
    doc_app_description = `for "${doc_app_name}" by arisu.cool 🍓 Project.`;
  } else {
    doc_app_name = package_name;
    doc_app_description = `for ${doc_app_name} (based on "im pact" by arisu.cool 🍓 Project).`;
  }
  if (package_version) doc_app_version = package_version;

  // Swagger による OpenAPI の対応 (/api/docs/ にてドキュメントを公開)
  const options = new DocumentBuilder()
    .setTitle(`${doc_app_name} API Document`)
    .setDescription(`API Document ${doc_app_description}`)
    .setVersion(doc_app_version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  // サーバの待ち受けを開始
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
