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
   * 学習用サンプルツイートの取得
   */
  async getSampleTweets(crawlAccount: string, keyword: string) {
    let tweets = [
      {
        created_at: new Date('Tue Dec 29 17:01:16 +0000 2020'),
        id_str: '1343965317978996742',
        text: '鋭意(再)開発中 https://t.co/IGrzZhTLM5',
        truncated: false,
        entities: {
          media: [
            {
              id_str: '1343965208755097601',
              media_url: 'http://pbs.twimg.com/media/Eqa5PJpU0AE2Uwi.jpg',
              media_url_https: 'https://pbs.twimg.com/media/Eqa5PJpU0AE2Uwi.jpg',
              url: 'https://t.co/IGrzZhTLM5',
              display_url: 'pic.twitter.com/IGrzZhTLM5',
              expanded_url: 'https://twitter.com/mugiply/status/1343965317978996742/photo/1',
              type: 'photo',
            },
          ],
        },
        source: '<a href="https://about.twitter.com/products/tweetdeck" rel="nofollow">TweetDeck</a>',
        user: {
          id_str: '1157995803937427457',
          name: 'mugip 🍓',
          screen_name: 'mugiply',
          location: '上方エリア',
          profile_image_url: 'http://pbs.twimg.com/profile_images/1289594904276922368/xX3zKqgN_normal.png',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/1289594904276922368/xX3zKqgN_normal.png',
          description:
            'ニワカPですが、がんばりまー!! ...最近は #ありかつ 人力ボットと化しつつあるおじさん。 橘ありすちゃんのイラストをお届けするボットを開発しました!! ☛ @arisucool ☚ フォローしてみてください!! 　　 【デレマス】🍓 ありす 🍓 　【シャニマス】🕊️ まの 🕊️ / 👘 りんぜ 👘',
        },
        retweet_count: 0,
        favorite_count: 5,
        possibly_sensitive: false,
        selected: false,
        lang: 'ja',
        url: 'https://twitter.com/mugiply/status/1343965317978996742',
      },
    ];
    return tweets;
  }
}
