import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';

export class TweetRetweetsFilter implements TweetFilter {
  constructor(private filterSettings: any) {}

  getDescription() {
    return 'ツイートのリツイート数によるフィルタ';
  }

  getScope() {
    return 'ツイートのリツイート数';
  }

  getSettingsDefinition() {
    return [];
  }

  async filter(tweet: CrawledTweet): Promise<number> {
    return tweet.crawledRetweetCount;
  }
}
