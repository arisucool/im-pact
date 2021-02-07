import { ActionBulk, ActionHelper, ActionSettingsDefinition, ExtractedTweet } from '@arisucool/im-pact-core';
import * as cronParser from 'cron-parser';

export default class ActionWaitForSchedule implements ActionBulk {
  constructor(private helper: Readonly<ActionHelper>) {}

  getDescription() {
    return '指定したスケジュールになったら次のアクションへ遷移するアクション';
  }

  getSettingsDefinition(): ActionSettingsDefinition[] {
    return [
      {
        name: 'schedule',
        title: 'スケジュール (Cron 書式:　分　時　日　月　曜日)',
        type: 'textarea',
        placeholder: `# 【例】 毎日の8時0分・12時0分・16時0分に実行
    0  8,12,16  *  *  *
    
    # 【例】 7月31日の毎時0分・15分・30分・45分に実行
    0,15,30,45  *  31  7  *`,
        rows: 6,
      },
      {
        name: 'sortConditionOfTweets',
        title: 'ツイートのソート条件',
        type: 'select',
        options: {
          likesDesc: 'いいねが多い順',
          likesAsc: 'いいねが少ない順',
          retweetsDesc: 'リツイートが多い順',
          retweetsAsc: 'リツイートが少ない順',
          crawledRetweetsDesc: '収集済みリツイートが多い順',
          crawledRetweetsAsc: '収集済みリツイートが少ない順',
          createdAtDesc: '投稿日時が新しい順',
          createdAtAsc: '投稿日時が古い順',
          crawledAtDesc: '収集日時が新しい順',
          crawledAtAsc: '収集日時が古い順',
          extractedAtDesc: '分類日時が新しい順',
          extractedAtAsc: '分類日時が古い順',
        },
      },
      {
        name: 'maxNumOfTweetsAtOneTime',
        title: '一回あたりの上限ツイート数',
        type: 'number',
        placeholder: '例: 1 (1件)',
      },
    ];
  }

  async execActionBulk(tweets: ExtractedTweet[]): Promise<{ [key: string]: boolean }> {
    // 設定を取得
    const maxNumOfTweetsAtOneTime = this.helper.getSetting().maxNumOfTweetsAtOneTime || 0;
    const sortConditionOfTweets = this.helper.getSetting().sortConditionOfTweets || null;
    const schedule = this.helper.getSetting().schedule || null;
    if (!schedule || schedule.replace(/\n/g, '').match(/^\s+$/)) {
      throw new Error('Schedule is not specified / スケジュールが設定されていません');
    }
    if (maxNumOfTweetsAtOneTime < 0) {
      throw new Error(
        'Maximum number of tweets at one time is invalid / 一回あたりの上限ツイート数には0または1以上の数値を指定してください',
      );
    }

    // 各ツイートを次アクションへ遷移させてよいか否かを返すため連想配列を初期化
    const results = {};

    // スケジュール設定を確認
    if (!this.shouldExecuteActionBySchedules(schedule)) {
      // 実行すべきタイミングでないならば、全てのツイートに対して、次のアクションへの遷移を拒否
      for (let i = 0, l = tweets.length; i < l; i++) {
        const tweet = tweets[i];
        results[tweet.id] = false;
      }
      return results;
    }

    // ツイートをソート
    if (sortConditionOfTweets) {
      tweets = tweets.sort((a: ExtractedTweet, b: ExtractedTweet) => {
        switch (sortConditionOfTweets) {
          // いいね数
          case 'likesDesc':
            return JSON.parse(a.rawJSONData).favorite_count > JSON.parse(a.rawJSONData).favorite_count ? -1 : 1;
          case 'likesAsc':
            return JSON.parse(a.rawJSONData).favorite_count < JSON.parse(a.rawJSONData).favorite_count ? -1 : 1;
          // リツイート数
          case 'retweetsDesc':
            return JSON.parse(a.rawJSONData).retweet_count > JSON.parse(a.rawJSONData).retweet_count ? -1 : 1;
          case 'retweetsAsc':
            return JSON.parse(a.rawJSONData).retweet_count < JSON.parse(a.rawJSONData).retweet_count ? -1 : 1;
          // 収集済みリツイート数
          case 'crawledRetweetsDesc':
            return a.crawledRetweetCount > b.crawledRetweetCount ? -1 : 1;
          case 'crawledRetweetsAsc':
            return a.crawledRetweetCount < b.crawledRetweetCount ? -1 : 1;
          // 投稿日時
          case 'createdAtDesc':
            return a.createdAt.getTime() > b.createdAt.getTime() ? -1 : 1;
          case 'createdAtAsc':
            return a.createdAt.getTime() < b.createdAt.getTime() ? -1 : 1;
          // 収集日時
          case 'crawledAtDesc':
            return a.crawledAt.getTime() > b.crawledAt.getTime() ? -1 : 1;
          case 'crawledAtAsc':
            return a.crawledAt.getTime() < b.crawledAt.getTime() ? -1 : 1;
          // 分類日時
          case 'extractedAtDesc':
            return a.extractedAt.getTime() > b.extractedAt.getTime() ? -1 : 1;
          case 'extractedAtAsc':
            return a.extractedAt.getTime() < b.extractedAt.getTime() ? -1 : 1;
        }
      });
    }

    // ツイートを反復
    for (let i = 0, l = tweets.length; i < l; i++) {
      const tweet = tweets[i];
      if (maxNumOfTweetsAtOneTime <= i) {
        // 当該ツイートｎ対して、次アクションへの遷移を拒否
        results[tweet.id] = false;
        continue;
      }

      // 当該ツイートに対して、次アクションへの遷移を許可
      results[tweet.id] = true;
    }

    // 各ツイートを次アクションへ遷移させてよいか否かを返す
    return results;
  }

  /**
   * 現在のタイミングでアクションを実行すべきか否かの取得
   * @param schedules スケジュール (Cron書式文字列 (複数行))
   */
  protected shouldExecuteActionBySchedules(schedules: string): boolean {
    // 現在時刻を取得
    const now = new Date().getTime();

    // 設定されたスケジュール (複数行) を反復
    for (const schedule of schedules.split(/\n/)) {
      if (schedule.length === 0 || schedule.match(/^s+$/)) {
        // 行が空ならば、スキップ
        continue;
      }

      try {
        const parsedSchedule = cronParser.parseExpression(schedule);
        const nextDate = parsedSchedule.prev();
        if (59000 <= Math.abs(now - nextDate.getTime())) {
          // 現在時刻から59秒以上違えば、スキップ
          continue;
        }
      } catch (e) {
        continue;
      }

      // アクションを実行すべき
      return true;
    }

    // アクションを実行すべきでない
    return false;
  }
}
