import { Injectable } from '@angular/core';
import { generate } from 'rxjs';
import { NgModel } from '@angular/forms';
import { DefaultService, GetExampleTweetsDto, CreateTopicDto, UpdateTopicDto } from 'src/.api-client';

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
    return await this.api.topicsControllerFindOne(topicId).toPromise();
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
    filters: any[];
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
        filters: topic.filters,
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
        filters: topic.filters,
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
    return {
      TfIllustImageClassicationFilter: {
        version: '1.0.0',
        description: 'Tensorflow によるイラスト判定フィルタ　/　適用対象: ツイートの添付画像',
        settings: [],
      },
      TweetTextRegExpFilter: {
        version: '1.0.0',
        description: 'ツイートの本文に対する正規表現によるフィルタ　/　適用対象: ツイートの本文',
        settings: [
          {
            name: 'regexp_pattern',
            title: '正規表現パターン',
            type: 'text',
            placeholder: '例: (ー|[ァ-ン])+・{0,1}タチバナ',
          },
        ],
      },
    };
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
   * 学習の実行
   * (お手本分類の結果と、ツイートフィルタ設定をもとにデータセットを生成し、分類器のモデルを生成する)
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @return 生成されたモデル
   */
  async train(trainingTweets: any[], filterSettings: any[]) {
    // データセットを生成
    let [trainingDataset, validationDataset] = await this.getTrainingDataset(trainingTweets, filterSettings);
    // 学習モデルの生成
    const generated_model = await this.trainModel(trainingDataset, validationDataset);
    return generated_model;
  }

  /**
   * 学習のためのデータセットの生成
   * @param trainingTweets お手本分類の結果
   * @param filterSettings ツイートフィルタ設定
   * @return 学習用データセットおよび検証用データセット
   */
  protected async getTrainingDataset(trainingTweets: any[], filterSettings: any[]) {
    // 各ツイートに対して、ツイートフィルタを実行し、分類のための変数を取得
    const datasets = [];
    let tweetFiltersResult = {};
    for (let tweet of trainingTweets) {
      datasets.push();
    }
    let trainingDataset = [];
    let validationDataset = [];
    return [trainingDataset, validationDataset];
  }

  /**
   * 学習モデルの検証
   * @param trained_model 学習モデル
   * @param trainingTweets お手本分類の結果
   */
  async validate(trained_model: any, trainingTweets: any[]) {
    let tweets = JSON.parse(JSON.stringify(trainingTweets));
    // TODO
    for (let tweet of tweets) {
      tweet.expectedSeleted = tweet.selected;
      tweet.selected = true;
    }
    return tweets;
  }

  /**
   * 学習モデルの生成
   * @param trainingDataset 学習用データセット
   * @param validationDataset 検証用データセット
   * @return 生成されたモデル
   */
  protected async trainModel(trainingDataset: any, validationDataset: any) {}
}
