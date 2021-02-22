import {
  TweetFilterSettingsDefinitionSelectItem,
  TweetFilterSettingsDefinitionInputItem,
  TweetFilterSettingsDefinitionTextareaItem,
} from './tweet-filter-settings-definition-item.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';

/**
 * ツイートフィルタの設定項目
 */
export type TweetFilterSettingsDefinition =
  | TweetFilterSettingsDefinitionInputItem
  | TweetFilterSettingsDefinitionTextareaItem
  | TweetFilterSettingsDefinitionSelectItem;

/**
 * ツイートフィルタの実行結果のサマリ (要約文および根拠)
 */
export interface TweetFilterResultSummaryWithEvidenceText {
  /**
   * 実行結果の要約文 (ツイートフィルタの実行結果を人間にとってわかりやすく表現したもの)
   * (例: 'このツイート本文は承認である'、'このプロフィールは拒否である'、...)
   */
  summaryText: string;

  /**
   * 実行結果を要約した値
   * (再トレーニングのときに使用される)
   */
  summaryValue?: string;

  /**
   * 実行結果の根拠 (実行結果の元となったツイート本文など)
   */
  evidenceText: string;
}

export interface TweetFilterResultSummaryWithEvidenceImages {
  /**
   * 実行結果の要約文 (ツイートフィルタの実行結果を人間にとってわかりやすく表現したもの)
   * (例: 'この添付画像は承認である'、'この添付画像は恐らく拒否である'、'この添付画像は公式画像である'、...)
   */
  summaryText: string;

  /**
   * 実行結果を要約した値
   * (再トレーニングのときに使用される)
   */
  summaryValue?: string;

  /**
   * 実行結果の根拠 (実行結果の元となった画像URL)
   */
  evidenceImageUrls: string[];
}

/**
 * ツイートフィルタの実行結果 (単一の値を返す場合)
 */
export interface TweetFilterResult {
  /**
   * 実行結果のサマリ
   */
  summary: TweetFilterResultSummaryWithEvidenceText | TweetFilterResultSummaryWithEvidenceImages;

  /**
   * 実行結果の値
   */
  value: {
    /**
     * 値の名称
     * (例: 'ツイート本文が承認である確率'、'ツイート本文が拒否である確率'、...)
     */
    title: string;

    /**
     * 値
     */
    value: number;
  };
}

/**
 * ツイートフィルタの実行結果 (複数の値を返す場合)
 */
export interface TweetFilterResultWithMultiValues {
  /**
   * 実行結果のサマリ
   */
  summary: TweetFilterResultSummaryWithEvidenceText | TweetFilterResultSummaryWithEvidenceImages;

  /**
   * 実行結果の値 (複数)
   */
  values: {
    /**
     * 値のキー
     */
    [key: string]: {
      /**
       * 値の名称
       * (例: 'ツイート本文が承認である確率'、'ツイート本文が拒否である確率'、...)
       */
      title: string;

      /**
       * 値
       */
      value: number;
    };
  };
}

/**
 * ツイートフィルタモジュールを実装するためのインタフェース
 */
export interface TweetFilter {
  getDescription(): string;
  getScope(): string;
  getSettingsDefinition(): Promise<TweetFilterSettingsDefinition[]> | TweetFilterSettingsDefinition[];
  shouldInitialize(): Promise<boolean>;
  filter(tweet: Tweet): Promise<TweetFilterResultWithMultiValues | TweetFilterResult>;
}
