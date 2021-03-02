import { BaseHelper } from './base.helper';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ModuleStorage } from '../module-storage';
import { ModuleTweetStorage } from '../module-tweet-storage';

export class TweetFilterHelper extends BaseHelper {
  private constructor(
    protected moduleName: string,
    protected filterId: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleTweetStorage: Readonly<ModuleTweetStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
    protected topicKeywords: string[],
  ) {
    super(moduleName, filterId, moduleStorage, moduleTweetStorage, moduleSetting, socialAccount);
  }

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    filterId: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleTweetStorage: Readonly<ModuleTweetStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    topicKeywords: string[],
  ): Readonly<TweetFilterHelper> => {
    return new TweetFilterHelper(
      moduleName,
      filterId,
      moduleStorage,
      moduleTweetStorage,
      moduleSetting,
      socialAccount,
      topicKeywords,
    );
  };

  /**
   * テスト用ファクトリメソッド
   */
  static readonly factoryTest = (moduleName: string, moduleSetting: any): Readonly<TweetFilterHelper> => {
    return new TweetFilterHelper(
      moduleName,
      'xxxxxxxxxxxxxxxx',
      null,
      null,
      moduleSetting,
      {
        accessToken: 'TEST',
        accessTokenSecret: 'TEST',
      } as any,
      ['arisucool'],
    );
  };

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
   * One Hot Encoding 化された値の取得
   * (カテゴリカル変数)
   * @param value 値
   * @param maxValue 最大値
   */
  oneToHot(value: number, maxValue: number): number[] {
    if (maxValue < value) {
      throw new Error(`Invalid value... value = ${value}, maxValue = ${maxValue}`);
    }

    const oneToHot = [];
    for (let i = 0; i <= maxValue; i++) {
      if (value == i) {
        oneToHot.push(1);
      } else {
        oneToHot.push(0);
      }
    }

    return oneToHot;
  }
}
