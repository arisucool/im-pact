import * as url from 'url';
import { RedisOptions } from 'ioredis';
import { DocumentBuilder, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export class Helper {
  /**
   * APIドキュメントの生成・取得
   * @param app Nest アプリケーション
   * @return 生成されたドキュメント
   */
  static generateAPIDocument(app: INestApplication): OpenAPIObject {
    // アプリケーション名の取得
    let package_name = null,
      package_version = null;
    try {
      const package_json = require(`${__dirname}/../../../package.json`);
      package_name = package_json.name;
      package_version = package_version = package_json.version;
    } catch (e) {}

    // ドキュメント情報の設定
    let doc_app_name = null,
      doc_app_description = null,
      doc_app_version = 'x.x.x';
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
    return SwaggerModule.createDocument(app, options);
  }

  /**
   * データベース接続設定の取得
   */
  static getDBSettings(synchronize: boolean = true): any {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length <= 0) {
      // 環境変数 DATABASE_URL が未指定ならば
      // オンメモリデータベースを使用
      console.log('[NOTE] On memory database enabled');
      return {
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        autoLoadEntities: true,
        synchronize: true,
      };
    }

    // DATABASE_URL で指定されたデータベースを使用
    let dbSettings = {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: null,
    };

    // 暗号化通信について設定
    if (process.env.DATABASE_URL.match(/sslmode=disable/)) {
      // DATABASE_URL にて明示的に無効化されているならば
      // 暗号化通信を無効化
      dbSettings.ssl = false;
    } else {
      // 暗号化通信を有効化
      dbSettings.ssl = {
        rejectUnauthorized: false, // Heroku Postgres 対応
      };
    }

    return dbSettings;
  }

  /**
   * Redis データベース接続設定の取得
   */
  static getRedisSettings(): any {
    if (!process.env.REDIS_URL || process.env.REDIS_URL.length <= 0) {
      // 環境変数 DATABASE_URL が未指定ならば
      console.warn('[Helper] REDIS_URL is not specified!');
      return {};
    }

    // REDIS_URL で指定されたデータベースを使用
    let redisSettings = Helper.getRedisOptionsByUrl(process.env.REDIS_URL);
    return redisSettings;
  }

  /**
   * 指定された REDIS_URL による Redis 接続設定の取得
   * @param urlString REDIS_URL
   */
  protected static getRedisOptionsByUrl(urlString: string): RedisOptions {
    const redisOptions: RedisOptions = {};
    try {
      const redisUrl = url.parse(urlString);
      redisOptions.port = Number(redisUrl.port) || 6379;
      redisOptions.host = redisUrl.hostname;
      redisOptions.db = redisUrl.pathname ? Number(redisUrl.pathname.split('/')[1]) : 0;
      if (redisUrl.auth) {
        redisOptions.password = redisUrl.auth.split(':')[1];
      }
      if (redisUrl.protocol === 'rediss:') {
        redisOptions.tls = {};
      }
    } catch (e) {
      throw new Error(e.message);
    }

    return redisOptions;
  }
}
