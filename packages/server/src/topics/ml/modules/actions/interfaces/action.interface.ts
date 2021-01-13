import { CrawledTweet } from '../../../entities/crawled-tweet.entity';
import { ActionSettingsDefinitionItem } from './action-settings-definition-item.interface';
import { ExtractedTweet } from 'src/topics/ml/entities/extracted-tweet.entity';
import { ActionSettingsDefinitionTextareaItem } from './action-settings-definition-textarea-item.interface';

/**
 * アクションモジュールを実装するためのインタフェース
 */
export interface Action {
  getDescription(): string;
  getSettingsDefinition():
    | Promise<(ActionSettingsDefinitionItem | ActionSettingsDefinitionTextareaItem)[]>
    | (ActionSettingsDefinitionItem | ActionSettingsDefinitionTextareaItem)[];
  execAction(tweet: ExtractedTweet): Promise<boolean> | boolean;
}
