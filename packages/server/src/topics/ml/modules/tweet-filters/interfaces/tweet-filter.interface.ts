import {
  TweetFilterSettingsDefinitionSelectItem,
  TweetFilterSettingsDefinitionInputItem,
  TweetFilterSettingsDefinitionTextareaItem,
} from './tweet-filter-settings-definition-item.interface';
import { Tweet } from 'src/topics/ml/entities/tweet.entity';

/**
 * ツイートフィルタモジュールの設定項目
 */
export type TweetFilterSettingsDefinition =
  | TweetFilterSettingsDefinitionInputItem
  | TweetFilterSettingsDefinitionTextareaItem
  | TweetFilterSettingsDefinitionSelectItem;

/**
 * ツイートフィルタモジュールを実装するためのインタフェース
 */
export interface TweetFilter {
  getDescription(): string;
  getScope(): string;
  getSettingsDefinition(): Promise<TweetFilterSettingsDefinition[]> | TweetFilterSettingsDefinition[];
  filter(tweet: Tweet): Promise<number> | Promise<number[]>;
}
