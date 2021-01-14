import { BaseHelper } from './base-helper';
import * as Twitter from 'twitter';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { ExtractedTweet } from '../entities/extracted-tweet.entity';
import { Topic } from 'src/topics/entities/topic.entity';

export class ActionHelper extends BaseHelper {
  private constructor(
    protected moduleName: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
    protected topic: Topic,
    protected actionIndex: number,
  ) {
    super(moduleName, moduleStorage, moduleSetting, socialAccount);
  }

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    topic: Topic,
    actionIndex: number,
  ): Readonly<ActionHelper> => {
    return new ActionHelper(moduleName, moduleStorage, moduleSetting, socialAccount, topic, actionIndex);
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
  getAcceptUrlByTweet(tweet: ExtractedTweet): string {
    return `${process.env.BASE_URL}/api/topics/${this.topic.id}/tweets/${
      tweet.id
    }/accept?token=t${this.getOwnActionIndex()}-${tweet.idStr}-${tweet.crawledAt.getTime()}`;
  }

  /**
   * ツイートを拒否して以降のアクションをキャンセルするためのURLの取得
   */
  getRejectUrlByTweet(tweet: ExtractedTweet): string {
    return `${process.env.BASE_URL}/api/topics/${this.topic.id}/tweets/${
      tweet.id
    }/reject?token=t${this.getOwnActionIndex()}-${tweet.idStr}-${tweet.crawledAt.getTime()}`;
  }
}
