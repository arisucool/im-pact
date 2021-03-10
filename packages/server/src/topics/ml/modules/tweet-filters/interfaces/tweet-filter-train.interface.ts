import { TweetFilter } from './tweet-filter.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';

/**
 * 学習対応のツイートフィルタモジュールを実装するためのインタフェース
 */
export interface TweetFilterTrain extends TweetFilter {
  train(tweet: Tweet, isSelected: boolean): Promise<void>;
  retrain(
    tweet: Tweet,
    previousChoiceKey: 'accept' | 'reject' | string,
    correctChoiceKey: 'accept' | 'reject' | string,
  ): Promise<void>;
}
