import * as Twitter from 'twitter';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';

export class ModuleHelper {
  constructor(
    private moduleName: string,
    private moduleStorage: Readonly<ModuleStorage>,
    private moduleSetting: any,
    private socialAccount: SocialAccount,
    private topicKeywords: string[],
  ) {}

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    topicKeywords: string[],
  ): Readonly<ModuleHelper> => {
    return new ModuleHelper(moduleName, moduleStorage, moduleSetting, socialAccount, topicKeywords);
  };

  /**
   * モジュールストレージの取得
   */
  getStorage(): Readonly<ModuleStorage> {
    return this.moduleStorage;
  }

  /**
   * モジュール設定の取得
   */
  getSetting(): { [key: string]: any } {
    return this.moduleSetting;
  }

  /**
   * トピックのキーワードの取得
   * (ツイートフィルタの学習にバイアスをかけたい場合などに使用する)
   */
  async getTopicKeywords(): Promise<string[]> {
    const keywords = this.topicKeywords;
    const keywordStrings = [];
    for (const keyword of keywords) {
      if (keyword.match(/"([\S\s]+)"/)) {
        keywordStrings.push(RegExp.$1);
      }
    }
    return keywordStrings;
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
