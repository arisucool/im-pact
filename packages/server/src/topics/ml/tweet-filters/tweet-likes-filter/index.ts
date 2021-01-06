import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { ModuleStorage } from '../module-storage';

export class TweetLikesFilter implements TweetFilter {
  constructor(private filterSettings: any, private storage: ModuleStorage) {}

  getDescription() {
    return 'ツイートのいいね数に対するフィルタ';
  }

  getScope() {
    return 'ツイートのいいね数';
  }

  getSettingsDefinition() {
    return [];
  }

  async filter(tweet: CrawledTweet): Promise<number> {
    return JSON.parse(tweet.rawJSONData).favorite_count;
  }
}
