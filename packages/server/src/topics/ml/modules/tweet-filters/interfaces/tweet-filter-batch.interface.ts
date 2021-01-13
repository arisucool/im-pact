import { TweetFilter } from './tweet-filter.interface';

/**
 * バッチ処理対応のツイートフィルタモジュールを実装するためのインタフェース
 */
export interface TweetFilterBatch extends TweetFilter {
  batch(): Promise<void>;
}
