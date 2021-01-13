import { ActionSettingsDefinitionItem } from './action-settings-definition-item.interface';

export interface ActionSettingsDefinitionTextareaItem extends ActionSettingsDefinitionItem {
  /**
   * テキストエリアの行数
   */
  rows?: number;
}
