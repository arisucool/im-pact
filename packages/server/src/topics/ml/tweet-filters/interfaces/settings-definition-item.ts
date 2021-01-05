export interface TweetFilterSettingsDefinitionItem {
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
   * 設定項目のプレースホルダ
   */
  placeholder: string | null;
}
