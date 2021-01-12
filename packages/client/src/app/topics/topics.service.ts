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
    let topic: any = await this.api.topicsControllerFindOne(topicId).toPromise();

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
    keywords: any[];
    filterPatterns: any[];
    enabledFilterPatternIndex: number;
    actions: any[];
    trainingTweets: any[];
  }) {
    if (topic.id === null) {
      // 新規作成
      let dto: CreateTopicDto = {
        name: topic.name,
        crawlSchedule: topic.crawlSchedule,
        crawlSocialAccountId: +topic.crawlSocialAccount.id,
        keywords: topic.keywords,
        filterPatterns: topic.filterPatterns,
        enabledFilterPatternIndex: topic.enabledFilterPatternIndex,
        actions: topic.actions,
        trainingTweets: topic.trainingTweets,
      };
      return await this.api.topicsControllerCreate(dto).toPromise();
    } else {
      // 編集
      let dto: UpdateTopicDto = {
        id: topic.id,
        name: topic.name,
        crawlSchedule: topic.crawlSchedule,
        keywords: topic.keywords,
        filterPatterns: topic.filterPatterns,
        enabledFilterPatternIndex: topic.enabledFilterPatternIndex,
        actions: topic.actions,
        trainingTweets: topic.trainingTweets,
      };
      return await this.api.topicsControllerUpdate(topic.id, dto).toPromise();
    }
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
   * @param module_name ツイートフィルタ名 (例: 'TweetTextRegExpFilter')
   */
  async getTweetFilter(module_name: string) {
    const filters = await this.getAvailableTweetFilters();
    return filters[module_name];
  }

  /**
   * 利用可能なアクションの取得
   */
  async getAvailableActions() {
    return {
      ApprovalOnDiscordAction: {
        version: '1.0.0',
        description: 'ツイートを Discord へ投稿し、次のアクションへ遷移するか承認を得るアクション',
        settings: [
          {
            name: 'webhook_url',
            title: 'Discord Webhook URL',
            type: 'url',
            placeholder: '例: https://discordapp.com/api/webhooks/000000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxx',
          },
          {
            name: 'content_template',
            title: '投稿本文',
            type: 'textarea',
            rows: 6,
            placeholder: `例: ツイートを収集しました。
%TWEET_URL%

承認: %APPROVAL_URL%

拒否: %REJECTION_URL%`,
          },
        ],
      },
      WaitForSecondsAction: {
        version: '1.0.0',
        description: '指定した時間が経過したら次のアクションへ遷移するアクション',
        settings: [
          {
            name: 'wait_seconds',
            title: '待機する秒数',
            type: 'number',
            placeholder: '例: 3600 (1時間)',
          },
        ],
      },
      ScheduleAction: {
        version: '1.0.0',
        description: '指定したスケジュールになったら次のアクションへ遷移するアクション',
        settings: [],
      },
      RetweetAction: {
        version: '1.0.0',
        description: 'ツイートをリツイートするアクション',
        settings: [],
      },
      PostToIFTTTAction: {
        version: '1.0.0',
        description: 'ツイートを IFTTT Webhook へ投稿するアクション',
        settings: [
          {
            name: 'event_name',
            title: 'IFTTT Webhook Event name',
            type: 'text',
            placeholder: '例: foo',
          },
          {
            name: 'webhook_key',
            title: 'IFTTT Webhook key',
            type: 'password',
            placeholder: '例: xxxxxxxxxxxxxxxxxxxxxx',
          },
          {
            name: 'value_1_template',
            title: 'Value 1',
            type: 'text',
            placeholder: '例: %TWEET_URL%',
          },
          {
            name: 'value_1_template',
            title: 'Value 2',
            type: 'text',
            placeholder: '例: %TWEET_CONTENT%',
          },
          {
            name: 'value_3_template',
            title: 'Value 3',
            type: 'text',
            placeholder: '例: %TWEET_AUTHOR_SCREEN_NAME%',
          },
        ],
      },
    };
  }

  /**
   * 指定されたアクションの取得
   * @param module_name アクション名 (例: 'ApprovalOnDiscordAction')
   */
  async getAction(module_name: string) {
    const actions = await this.getAvailableActions();
    return actions[module_name];
  }

  /**
   * 学習用サンプルツイートの取得
   */
  async getSampleTweets(crawlSocialAccountId: number, keyword: string) {
    const dto: GetExampleTweetsDto = {
      crawlSocialAccountId: crawlSocialAccountId,
      keyword: keyword,
    };
    let tweets: any[] = await this.api.mlControllerGetExampleTweets(dto).toPromise();
    for (let tweet of tweets) {
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
            if (jobStatus.status != 'completed' && jobStatus.status != 'failed') return;
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
