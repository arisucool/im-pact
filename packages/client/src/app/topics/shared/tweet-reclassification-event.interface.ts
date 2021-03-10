import { TweetFilterRetrainingRequest } from 'src/.api-client';

/**
 * ツイートの再分類を行うためのイベント
 * (ディープラーニング分類器 および ツイートフィルタの再トレーニングも行う)
 */
export interface TweetReclassificationEvent {
  // ツイートのID
  tweetIdStr: string;

  // ツイートの遷移先アクション (承認となった場合のみ)
  destinationActionIndex: number;

  // ディープラーニング分類器を再トレーニングするための情報
  classifierRetrainingRequest: {
    /**
     * ユーザによる承認・拒否の判定
     */
    selected: boolean;
  };

  // ツイートフィルタを再トレーニングするための情報
  filterRetrainingRequests: TweetFilterRetrainingRequest[];
}
