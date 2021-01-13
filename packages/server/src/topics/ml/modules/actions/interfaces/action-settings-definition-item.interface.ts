type Type = 'text' | 'url' | 'number' | 'email' | 'tel' | 'password' | 'date' | 'textarea';

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

  /**
   * 利用可能なテンプレート文字列
   * (例: 'TEMPLATE_URL' => 'テンプレート文字列')
   */
  templateVariables?: { [key: string]: string };

  /**
   * 設定項目のプレースホルダ
   */
  placeholder: string | null;
}
