import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { ModuleStorage } from '../module-storage';

export class TweetRetweetsFilter implements TweetFilter {
  constructor(private filterSettings: any, private storage: ModuleStorage) {}

  getDescription() {
    return 'ツイートのリツイート数に対するフィルタ';
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
