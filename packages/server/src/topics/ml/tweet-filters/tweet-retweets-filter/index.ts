import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { ModuleHelper } from '../module-helper';

export class TweetRetweetsFilter implements TweetFilter {
  constructor(private helper: Readonly<ModuleHelper>) {}

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
