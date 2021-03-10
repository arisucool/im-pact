import {
  Tweet,
  TweetFilter,
  TweetFilterHelper,
  TweetFilterSettingsDefinition,
  TweetFilterResult,
} from '@arisucool/im-pact-core';

export default class FilterTweetSensitiveFlag implements TweetFilter {
  constructor(private helper: Readonly<TweetFilterHelper>) {}

  getDescription() {
    return 'ツイートのセンシティブフラグに対するフィルタ';
  }

  getScope() {
    return 'ツイートのセンシティブフラグ';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async shouldInitialize(): Promise<boolean> {
    return false;
  }

  async filter(tweet: Tweet): Promise<TweetFilterResult> {
    // センシティブフラグを取得
    let possiblySensitive: boolean = JSON.parse(tweet.rawJSONData).possibly_sensitive;
    if (!possiblySensitive) {
      possiblySensitive = false;
    }
    const valueNumber = possiblySensitive ? 1 : 0;

    // フィルタ結果を返す
    return {
      summary: {
        evidenceTitle: 'ツイートのセンシティブフラグ',
        evidenceText: possiblySensitive.toString(),
      },
      value: {
        title: 'センシティブフラグ',
        value: this.helper.oneToHot(valueNumber, 1), // [1, 0] または [0, 1] へ変換
      },
    };
  }
}
