import { TweetFilter, TweetFilterSettingsDefinition } from '../interfaces/tweet-filter.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';
import { TweetFilterHelper } from '../../tweet-filter-helper';

export class TweetLikesFilter implements TweetFilter {
  constructor(private helper: Readonly<TweetFilterHelper>) {
    helper.toString();
  }

  getDescription() {
    return 'ツイートのいいね数に対するフィルタ';
  }

  getScope() {
    return 'ツイートのいいね数';
  }

  getSettingsDefinition(): TweetFilterSettingsDefinition[] {
    return [];
  }

  async filter(tweet: Tweet): Promise<number> {
    return JSON.parse(tweet.rawJSONData).favorite_count;
  }
}
