import {
  ActionSettingsDefinitionTextareaItem,
  ActionSettingsDefinitionSelectItem,
  ActionSettingsDefinitionInputItem,
} from './action-settings-definition-item.interface';
import { ClassifiedTweet } from 'src/topics/ml/entities/classified-tweet.entity';

/**
 * アクションモジュールの設定項目
 */
export type ActionSettingsDefinition =
  | ActionSettingsDefinitionInputItem
  | ActionSettingsDefinitionSelectItem
  | ActionSettingsDefinitionTextareaItem;

/**
 * アクションモジュールを実装するためのインタフェース
 */
export interface Action {
  getDescription(): string;
  getSettingsDefinition(): Promise<ActionSettingsDefinition[]> | ActionSettingsDefinition[];
  execAction(tweet: ClassifiedTweet): Promise<boolean> | boolean;
}

/**
 * 一括アクションが可能なアクションモジュールを実装するためのインタフェース
 */
export interface ActionBulk extends Omit<Action, 'execAction'> {
  execActionBulk(tweets: ClassifiedTweet[]): Promise<{ [key: string]: boolean }> | { [key: string]: boolean };
}
