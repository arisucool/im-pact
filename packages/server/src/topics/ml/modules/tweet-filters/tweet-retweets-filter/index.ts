import { TweetFilter, TweetFilterSettingsDefinition } from '../interfaces/tweet-filter.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';
import { TweetFilterHelper } from '../../module-helpers/tweet-filter.helper';

export class TweetRetweetsFilter implements TweetFilter {
  constructor(private helper: Readonly<TweetFilterHelper>) {}

  getDescription() {
    return 'ツイートのリツイート数に対するフィルタ';
  }

  getScope() {
    return 'ツイートのリツイート数';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async filter(tweet: Tweet): Promise<number> {
    return tweet.crawledRetweetCount;
  }
}
