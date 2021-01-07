import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { ModuleHelper } from '../module-helper';

export class TweetLikesFilter implements TweetFilter {
  constructor(private helper: Readonly<ModuleHelper>) {
    helper.toString();
  }

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
