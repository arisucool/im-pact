/**
 * ツイートフィルタ
 */
export interface TweetFilter {
  id: string;
  filterName: string;
  settings: { [key: string]: any };
  features: {
    train: boolean;
    batch: boolean;
  };
}

/**
 * ツイートフィルタの実行結果
 */
export interface TweetFilterResult {
  filterName: string;
  filterId: string;
  result: {
    /**
     * 実行結果のサマリ
     */
    summary: {
      summaryText: string;
      summaryValue?: string;
      evidenceImageUrls?: string[];
      evidenceText?: string;
    };

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
  };
}

/**
 * ツイートフィルタを再トレーニングするための情報
 */
export interface TweetFilterTraining {
  /**
   * ツイートフィルタの情報
   */
  filter: TweetFilter;

  /**
   * ツイートフィルタ名
   */
  filterName: string;

  /**
   * ツイートフィルタ
   */
  filterResult: TweetFilterResult;
}
