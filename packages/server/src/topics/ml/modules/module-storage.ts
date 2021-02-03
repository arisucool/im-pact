import { Repository } from 'typeorm';
import * as ModuleStorageEntity from '../entities/module-storage.entity';

export class ModuleStorage {
  protected repositoryItem: ModuleStorageEntity.ModuleStorage = null;
  protected storage: { [key: string]: any } = {};

  /**
   * コンストラクタ
   * @param moduleName モジュール名 (例: 'FilterTweetTextBayesian')
   * @param repository モジュールストレージのリポジトリ
   */
  private constructor(private moduleName: string, private repository: Repository<ModuleStorageEntity.ModuleStorage>) {}

  /**
   * ファクトリメソッド
   * @param moduleName モジュール名 (例: 'FilterTweetTextBayesian')
   * @param repository モジュールストレージのリポジトリ
   */
  static readonly factory = async (
    moduleName: string,
    repository: Repository<ModuleStorageEntity.ModuleStorage>,
  ): Promise<Readonly<ModuleStorage>> => {
    const instance = new ModuleStorage(moduleName, repository);
    await instance.load();
    return instance;
  };

  /**
   * 読み込み
   */
  protected async load(): Promise<void> {
    this.repositoryItem = await this.repository.findOne(this.moduleName);
    if (!this.repositoryItem) {
      this.repositoryItem = new ModuleStorageEntity.ModuleStorage();
      this.repositoryItem.id = this.moduleName;
      this.repositoryItem.value = '{}';
    }
    try {
      this.storage = JSON.parse(this.repositoryItem.value);
    } catch (e) {
      this.storage = {};
    }
  }

  /**
   * 全消去
   */
  async clear(): Promise<void> {
    this.repositoryItem = await this.repository.findOne(this.moduleName);
    await this.repositoryItem.remove();
    this.storage = {};
  }

  /**
   * キーの取得
   * @return キーのリスト
   */
  async keys(): Promise<string[]> {
    if (this.repositoryItem == null) throw 'repository not loaded';
    return Object.keys(this.storage);
  }

  /**
   * 指定されたキーによる値の取得
   * @param key キー
   */
  async get(key: string): Promise<any> {
    if (this.repositoryItem == null) throw 'repository not loaded';
    return this.storage[key];
  }

  /**
   * 指定されたキーによる値の保存
   * @param key キー
   * @param value 値
   */
  async set(key: string, value: any) {
    if (this.repositoryItem == null) throw 'repository not loaded';
    this.storage[key] = value;
    this.repositoryItem.value = JSON.stringify(this.storage);
    await this.repositoryItem.save();
  }
}
