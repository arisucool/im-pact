/**
 * アクションの設定項目
 */
export interface ActionSettingsDefinitionItem {
  /**
   * 設定項目の名前
   */
  name: string;

  /**
   * 設定項目のタイトル (表示名)
   */
  title: string;

  /**
   * 設定項目の種別
   */
  type: string;
}

/**
 * 入力欄による設定項目
 */
export interface ActionSettingsDefinitionInputItem extends ActionSettingsDefinitionItem {
  /**
   * 設定項目の種別
   */
  type: 'text' | 'url' | 'number' | 'email' | 'tel' | 'password' | 'date';

  /**
   * 設定項目のプレースホルダ
   */
  placeholder?: string;

  /**
   * 利用可能なテンプレート文字列
   * (例: 'TEMPLATE_URL' => 'テンプレート文字列')
   */
  templateVariables?: { [key: string]: string };
}

/**
 * テキストエリアによる設定項目
 */
export interface ActionSettingsDefinitionTextareaItem extends ActionSettingsDefinitionItem {
  /**
   * 設定項目の種別
   */
  type: 'textarea';

  /**
   * 設定項目のプレースホルダ
   */
  placeholder?: string;

  /**
   * 利用可能なテンプレート文字列
   * (例: 'TEMPLATE_URL' => 'テンプレート文字列')
   */
  templateVariables?: { [key: string]: string };

  /**
   * 行数
   */
  rows?: number;
}

/**
 * セレクトボックスによる設定項目
 */
export interface ActionSettingsDefinitionSelectItem extends ActionSettingsDefinitionItem {
  /**
   * 設定項目の種別
   */
  type: 'select';

  /**
   * セレクトボックスの選択肢
   */
  options: { [key: string]: string };
}
