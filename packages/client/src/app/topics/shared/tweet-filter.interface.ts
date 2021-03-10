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
      evidenceTitle: string;
      evidenceImageUrls?: string[];
      evidenceText?: string;
      resultChoiceKey?: string;
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

    /**
     * 再学習のための選択肢
     */
    choices: TweetFilterChoice[];
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
