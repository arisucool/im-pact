export class Helper {
  /**
   * データベース設定の取得
   */
  static getDBSettings(): any {
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
}
