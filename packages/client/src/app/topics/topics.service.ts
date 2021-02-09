import { Injectable } from '@angular/core';
import {
  DefaultService,
  GetExampleTweetsDto,
  CreateTopicDto,
  UpdateTopicDto,
  TrainAndValidateDto,
} from 'src/.api-client';

@Injectable({
  providedIn: 'root',
})
export class TopicsService {
  constructor(private api: DefaultService) {}

  /**
   * 指定されたトピックの取得
   * @param topicId トピックID
   */
  async getTopic(topicId: number) {
    const topic: any = await this.api.topicsControllerFindOne(topicId).toPromise();

    // JSON でシリアライズされた項目をパース
    // TODO: APIクライアント側でどうにかする方法がないのかを考える
    for (let i = 0, l = topic.filterPatterns.length; i < l; i++) {
      topic.filterPatterns[i] = JSON.parse(topic.filterPatterns[i]);
    }
    for (let i = 0, l = topic.trainingTweets.length; i < l; i++) {
      topic.trainingTweets[i] = JSON.parse(topic.trainingTweets[i]);
    }
    for (let i = 0, l = topic.actions.length; i < l; i++) {
      topic.actions[i] = JSON.parse(topic.actions[i]);
    }

    // 返す
    return topic;
  }

  /**
   * 指定されたトピックの保存
   * @param topic トピック
   */
  async saveTopic(topic: {
    id: any;
    name: any;
    crawlSocialAccount: any;
    crawlSchedule: any;
    searchCondition: {
      keywords: string[];
      language: string;
      to: string;
      minFaves: number;
      minRetweets: number;
      minReplies: number;
      images: boolean;
    };
    filterPatterns: any[];
    enabledFilterPatternIndex: number;
    actions: any[];
    trainingTweets: any[];
  }) {
    if (topic.id === null) {
      // 新規作成
      const dto: CreateTopicDto = {
        name: topic.name,
        crawlSchedule: topic.crawlSchedule,
        crawlSocialAccountId: +topic.crawlSocialAccount.id,
        searchCondition: topic.searchCondition,
        filterPatterns: topic.filterPatterns,
        enabledFilterPatternIndex: topic.enabledFilterPatternIndex,
        actions: topic.actions,
        trainingTweets: topic.trainingTweets,
      };
      return await this.api.topicsControllerCreate(dto).toPromise();
    } else {
      // 編集
      const dto: UpdateTopicDto = {
        id: topic.id,
        name: topic.name,
        crawlSchedule: topic.crawlSchedule,
        searchCondition: topic.searchCondition,
        filterPatterns: topic.filterPatterns,
        enabledFilterPatternIndex: topic.enabledFilterPatternIndex,
        actions: topic.actions,
        trainingTweets: topic.trainingTweets,
      };
      return await this.api.topicsControllerUpdate(topic.id, dto).toPromise();
    }
  }

  /**
   * 指定されたトピックIDによる抽出済みツイートの取得
   * @param topicId トピックID
   * @param predictedClass 分類されたクラス
   * @param lastActionIndex アクション番号 (承認ツイートを取得する場合に添える)
   * @param lastExtractedAt 抽出日時 (この日付より古い項目が取得される)
   * @return 抽出済みツイート
   */
  async getClassifiedTweets(
    topicId: number,
    predictedClass: string,
    lastActionIndex?: number,
    lastExtractedAt?: Date,
  ): Promise<any[]> {
    return await this.api
      .topicsControllerGetExtractedTweets(topicId, predictedClass, lastActionIndex, lastExtractedAt?.getTime())
      .toPromise();
  }

  /**
   * 指定されたツイートの承認
   * @param topicId トピックID
   * @param tweet ツイート
   * @param actionIndex アクション番号 (-1ならば最初のアクションから実行される。未指定ならば現在の次のアクションから実行される。)
   */
  async acceptTweet(topicId: number, tweet: any, actionIndex?: number) {
    return await this.api.topicsControllerAcceptTweet(topicId, tweet.id, actionIndex).toPromise();
  }

  /**
   * 指定されたツイートの拒否
   * @param topicId トピックID
   * @param tweet ツイート
   */
  async rejectTweet(topicId: number, tweet: any) {
    return await this.api.topicsControllerRejectTweet(topicId, tweet.id).toPromise();
  }

  /**
   * 指定されたトピックにおける収集の実行
   * @param topicId トピックID
   */
  async execCrawl(topicId: number): Promise<void> {
    const jobId: number = (await this.api.topicsControllerCrawl(topicId).toPromise()) as any;
    // TODO: 完了を通知可能に
    return null;
  }

  /**
   * 指定されたトピックにおける収集の実行
   * @param topicId トピックID
   */
  async execActions(topicId: number): Promise<void> {
    const jobId: number = (await this.api.topicsControllerExecActions(topicId).toPromise()) as any;
    // TODO: 完了を通知可能に
    return null;
  }

  /**
   * 利用可能なソーシャルアカウントの取得
   */
  async getAvailableSocialAccounts() {
    return await this.api.socialAccountsControllerFindAll().toPromise();
  }

  /**
   * 利用可能なツイートフィルタの取得
   */
  async getAvailableTweetFilters() {
    return await this.api.mlControllerGetAvailableTweetFilters().toPromise();
  }

  /**
   * 指定されたツイートフィルタの取得
   * @param moduleName ツイートフィルタ名 (例: 'TweetTextRegExpFilter')
   */
  async getTweetFilter(moduleName: string) {
    const filters = await this.getAvailableTweetFilters();
    return filters[moduleName];
  }

  /**
   * 利用可能なアクションの取得
   */
  async getAvailableActions() {
    return await this.api.mlControllerGetAvailableActions().toPromise();
  }

  /**
   * 指定されたアクションの取得
   * @param moduleName アクション名 (例: 'ApprovalOnDiscordAction')
   */
  async getAction(moduleName: string) {
    const actions = await this.getAvailableActions();
    return actions[moduleName];
  }

  /**
   * 学習用サンプルツイートの取得
   */
  async getSampleTweets(
    crawlSocialAccountId: number,
    searchCondition: {
      keywords: string[];
      language: string;
      to?: string;
      minFaves?: number;
      minRetweets?: number;
      minReplies?: number;
      images?: boolean;
    },
  ) {
    const dto: GetExampleTweetsDto = {
      crawlSocialAccountId: crawlSocialAccountId,
      searchCondition: searchCondition,
    };
    const tweets: any[] = await this.api.mlControllerGetExampleTweets(dto).toPromise();
    for (const tweet of tweets) {
      tweet.selected = false;
    }
    return tweets;
  }

  /**
   * トレーニングおよび検証
   * @param topicId トピックID
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @param topicKeywords トピックのキーワード
   * @return トレーニングおよび検証の結果
   */
  async trainAndValidate(
    topicId: number,
    trainingTweets: any[],
    filterSettings: any[],
    topicKeywords: any[],
  ): Promise<any> {
    console.log('trainAndValidate');

    const dto: TrainAndValidateDto = {
      topicId: topicId,
      trainingTweets: trainingTweets,
      filters: filterSettings,
      topicKeywords: topicKeywords,
    };

    const jobId: number = (await this.api.mlControllerTrainAndValidate(dto).toPromise()) as any;

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        this.api
          .mlControllerGetStatusOfTrainAndValidate(jobId)
          .toPromise()
          .then((jobStatus: any) => {
            if (jobStatus.status !== 'completed' && jobStatus.status !== 'failed') return;
            clearInterval(interval);
            if (jobStatus.status === 'failed') {
              return reject(jobStatus.errorMessage);
            }
            resolve(jobStatus.result);
          });
      }, 1000);
    });
  }
}
