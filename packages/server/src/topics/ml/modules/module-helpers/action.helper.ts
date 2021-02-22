import { BaseHelper } from './base.helper';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ModuleStorage } from '../module-storage';
import { ModuleTweetStorage } from '../module-tweet-storage';
import { ClassifiedTweet } from '../../entities/classified-tweet.entity';
import { Topic } from 'src/topics/entities/topic.entity';

export class ActionHelper extends BaseHelper {
  private constructor(
    protected moduleName: string,
    protected actionId: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleTweetStorage: Readonly<ModuleTweetStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
    protected topic: Topic,
    protected actionIndex: number,
  ) {
    super(moduleName, actionId, moduleStorage, moduleTweetStorage, moduleSetting, socialAccount);
  }

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    actionId: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleTweetStorage: Readonly<ModuleTweetStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    topic: Topic,
    actionIndex: number,
  ): Readonly<ActionHelper> => {
    return new ActionHelper(
      moduleName,
      actionId,
      moduleStorage,
      moduleTweetStorage,
      moduleSetting,
      socialAccount,
      topic,
      actionIndex,
    );
  };

  /**
   * テスト用ファクトリメソッド
   */
  static readonly factoryTest = (moduleName: string, moduleSetting: any): Readonly<ActionHelper> => {
    return new ActionHelper(
      moduleName,
      'xxxxxxxxxxxxxxxx',
      null,
      null,
      moduleSetting,
      {
        accessToken: 'TEST',
        accessTokenSecret: 'TEST',
      } as SocialAccount,
      {
        id: 1,
      } as Topic,
      0,
    );
  };

  /**
   * 自分自身のアクションのインデックス番号の取得
   */
  getOwnActionIndex(): number {
    return this.actionIndex;
  }

  /**
   * ツイートを承認して次のアクションへ遷移するためのURLの取得
   */
  getAcceptUrlByTweet(tweet: ClassifiedTweet): string {
    return `${process.env.BASE_URL}/api/topics/${this.topic.id}/tweets/${
      tweet.id
    }/acceptWithAction?token=t${this.getOwnActionIndex()}-${tweet.idStr}-${tweet.crawledAt.getTime()}`;
  }

  /**
   * ツイートを拒否して以降のアクションをキャンセルするためのURLの取得
   */
  getRejectUrlByTweet(tweet: ClassifiedTweet): string {
    return `${process.env.BASE_URL}/api/topics/${this.topic.id}/tweets/${
      tweet.id
    }/rejectWithAction?token=t${this.getOwnActionIndex()}-${tweet.idStr}-${tweet.crawledAt.getTime()}`;
  }
}
