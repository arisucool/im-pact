import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';

export class TweetLikesFilter implements TweetFilter {
  constructor(private filterSettings: any) {}

  getDescription() {
    return 'ツイートのいいね数によるフィルタ';
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