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
 * ツイートフィルタを再学習させるための選択肢
 */
export interface TweetFilterChoice {
  /**
   * 選択肢のキー
   * (例: 'accept')
   */
  key: string;

  /**
   * 選択肢のアイコン
   * (例: 'thumb_up')
   */
  icon: string;

  /**
   * 選択肢の表示名
   * (例: '承認')
   */
  title: string;

  /**
   * 選択肢の色
   * (例: '#f44336')
   */
  color: string;
}

/**
 * ツイートフィルタの実行結果のサマリ (要約文および根拠)
 */
export interface TweetFilterResultSummary {
  /**
   * 実行結果の根拠の名称
   * (例: 'ツイートの本文'、'投稿者のプロフィール'、...)
   */
  evidenceTitle: string;

  /**
   * 実行結果の選択肢
   * (例: 'accept')
   */
  resultChoiceKey?: 'accept' | 'reject' | string;
}

export interface TweetFilterResultSummaryWithEvidenceText extends TweetFilterResultSummary {
  /**
   * 実行結果の根拠 (実行結果の元となったツイート本文など)
   */
  evidenceText: string;
}

export interface TweetFilterResultSummaryWithEvidenceImages extends TweetFilterResultSummary {
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
    value: number | number[];
  };

  /**
   * 再学習のための選択肢
   */
  choices?: 'acceptOrReject' | TweetFilterChoice[];
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
      value: number | number[];
    };
  };

  /**
   * 再学習のための選択肢
   */
  choices?: 'acceptOrReject' | TweetFilterChoice[];
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
