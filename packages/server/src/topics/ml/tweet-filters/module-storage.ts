import { Repository } from 'typeorm';
import * as ModuleStorageEntity from '../entities/module-storage.entity';

export class ModuleStorage {
  /**
   * コンストラクタ
   * @param moduleName モジュール名 (例: 'TweetTextBayesianFilter')
   * @param repository モジュールストレージのリポジトリ
   */
  constructor(private moduleName: string, private repository: Repository<ModuleStorageEntity.ModuleStorage>) {}

  /**
   * 指定されたキーによる値の取得
   * @param key キー
   */
  async get(key: string): Promise<any> {
    const value = (await this.repository.findOne(this.getIdByKey(key)))?.value;
    if (!value) return null;
    return JSON.parse(value);
  }

  /**
   * 指定されたキーによる値の保存
   * @param key キー
   * @param value 値
   */
  async set(key: string, value: any) {
    const item: ModuleStorageEntity.ModuleStorage = new ModuleStorageEntity.ModuleStorage();
    item.id = this.getIdByKey(key);
    item.value = JSON.stringify(value);
    this.repository.save(item);
  }

  /**
   * 指定されたキーからのIDの取得
   * (データベースへ保存するためのIDの取得)
   * @param key キー
   */
  private getIdByKey(key: string): string {
    return `${this.moduleName}:${key.toLowerCase()}`;
  }
}
