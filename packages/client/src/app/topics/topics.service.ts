import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TopicsService {
  constructor() {}

  /**
   * 指定されたツイートフィルタの取得
   * @param module_name ツイートフィルタ名 (例: 'TweetTextRegExpFilter')
   */
  async getTweetFilter(module_name: string) {
    const filters = await this.getAvailableTweetFilters();
    return filters[module_name];
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
   * 利用可能なアクションの取得
   */
  async getAvailableActions() {
    return {
      ApprovalOnDiscordAction: {
        version: '1.0.0',
        description: 'ツイートを Discord へ投稿し、次のアクションへ遷移するか承認を得るためのアクション',
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
      WaitAction: {
        version: '1.0.0',
        description: '指定時間経過後に次のアクションへ遷移するアクション',
        settings: [
          {
            name: 'wait_seconds',
            title: '待機する秒数',
            type: 'number',
            placeholder: '例: 3600 (1時間)',
          },
        ],
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
}
