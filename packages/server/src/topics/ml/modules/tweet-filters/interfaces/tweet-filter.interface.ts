import { TweetFilterSettingsDefinitionItem } from './tweet-filter-settings-definition-item.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';

/**
 * ツイートフィルタモジュールを実装するためのインタフェース
 */
export interface TweetFilter {
  getDescription(): string;
  getScope(): string;
  getSettingsDefinition(): Promise<TweetFilterSettingsDefinitionItem[]> | TweetFilterSettingsDefinitionItem[];
  filter(tweet: Tweet): Promise<number>;
}
