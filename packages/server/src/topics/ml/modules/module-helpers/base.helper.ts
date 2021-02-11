import * as Twitter from 'twitter';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ModuleStorage } from '../module-storage';
import { ModuleTweetStorage } from '../module-tweet-storage';
/* eslint @typescript-eslint/naming-convention: 0 */

export abstract class BaseHelper {
  constructor(
    protected moduleName: string,
    protected id: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleTweetStorage: Readonly<ModuleTweetStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
  ) {}

  /**
   * アクションまたはツイートフィルタのIDの取得
   */
  getId(): string {
    return this.id;
  }

  /**
   * モジュールストレージの取得
   */
  getStorage(): Readonly<ModuleStorage> {
    return this.moduleStorage;
  }

  /**
   * ツイート別モジュールストレージの取得
   */
  getTweetStorage(): Readonly<ModuleTweetStorage> {
    return this.moduleTweetStorage;
  }

  /**
   * モジュール設定の取得
   */
  getSetting(): { [key: string]: any } {
    return this.moduleSetting;
  }

  /**
   * Twitter クライアントの取得
   */
  getTwitterClient(): Twitter {
    // Twitter クライアントを初期化
    if (!process.env.TWITTER_CONSUMER_KEY)
      throw new Error('TWITTER_CONSUMER_KEY is not specfied in the environment variable.');
    if (!process.env.TWITTER_CONSUMER_SECRET)
      throw new Error('TWITTER_CONSUMER_SECRET is not specfied in the environment variable.');
    const twitterClient = new Twitter({
      access_token_key: this.socialAccount.accessToken,
      access_token_secret: this.socialAccount.accessTokenSecret,
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    });

    return twitterClient;
  }
}
