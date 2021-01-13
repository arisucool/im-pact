import { TweetFilter } from '../interfaces/tweet-filter.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';
import { ModuleHelper } from '../../module-helper';

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

  async filter(tweet: Tweet): Promise<number> {
    return JSON.parse(tweet.rawJSONData).favorite_count;
  }
}
