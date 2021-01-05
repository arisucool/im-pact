import { CrawledTweet } from '../../entities/crawled-tweet.entity';
import { TweetFilterSettingsDefinitionItem } from './settings-definition-item';

/**
 * ツイートフィルタを実装するためのインタフェース
 */
export interface TweetFilter {
  getDescription(): string;
  getScope(): string;
  getSettingsDefinition(): Promise<TweetFilterSettingsDefinitionItem[]> | TweetFilterSettingsDefinitionItem[];
  filter(tweet: CrawledTweet): Promise<number> | number;
}
