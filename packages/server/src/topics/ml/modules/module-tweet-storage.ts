import { Repository } from 'typeorm';
import { CrawledTweet } from '../entities/crawled-tweet.entity';
import { ClassifiedTweet } from '../entities/classified-tweet.entity';
import { ModuleStorage } from './module-storage';

export class ModuleTweetStorage {
  /**
   * コンストラクタ
   * @param moduleName モジュール名 (例: 'FilterTweetTextBayesian')
   * @param id         ツイートフィルタまたはアクションのID (ストレージを分離するための識別子)
   * @param repository ツイートのリポジトリ
   * @param moduleStorage モジュールストレージ
   */
  private constructor(
    private moduleName: string,
    private id: string,
    private repository: Repository<CrawledTweet | ClassifiedTweet>,
    private moduleStorage: Readonly<ModuleStorage>,
  ) {}

  /**
   * ファクトリメソッド
   * @param moduleName モジュール名 (例: 'FilterTweetTextBayesian')
   * @param id         ツイートフィルタまたはアクションのID (ストレージを分離するための識別子)
   * @param repository ツイートのリポジトリ
   * @param moduleStorage モジュールストレージ
   */
  static readonly factory = (
    moduleName: string,
    id: string,
    repository: Repository<CrawledTweet | ClassifiedTweet>,
    moduleStorage: Readonly<ModuleStorage>,
  ): Readonly<ModuleTweetStorage> => {
    return new ModuleTweetStorage(moduleName, id, repository, moduleStorage);
  };

  /**
   * 指定されたツイートおよびキーによる値の取得
   * @param tweetId ツイートのID
   * @param key キー
   */
  async get(tweetId: number, key: string): Promise<any> {
    const tweet: CrawledTweet | ClassifiedTweet = await this.repository.findOne(tweetId);
    let moduleData = {};
    if (tweet) {
      // データベースにツイートが存在する場合は、当該ツイートのモジュールデータから取得
      try {
        moduleData = JSON.parse(tweet.moduleData);
      } catch (e) {}
      return moduleData[this.getIdByKey(key)];
    } else {
      // データベースにツイートが存在しない場合は、代替としてモジュールストレージから取得
      try {
        let data = await this.moduleStorage.get(`_unrelatedTweetsStorage-${tweetId}`);
        if (data) moduleData = data;
      } catch (e) {}
      return moduleData[key];
    }
  }

  /**
   * 指定されたツイートおよびキーによる値の保存
   * @param tweetId ツイートのID
   * @param key キー
   * @param value 値
   */
  async set(tweetId: number, key: string, value: any) {
    const tweet: CrawledTweet | ClassifiedTweet = await this.repository.findOne(tweetId);
    let moduleData = {};
    if (tweet) {
      // データベースにツイートが存在する場合は、当該ツイートのモジュールデータへ保存
      try {
        moduleData = JSON.parse(tweet.moduleData);
      } catch (e) {}

      moduleData[this.getIdByKey(key)] = value;
      tweet.moduleData = JSON.stringify(moduleData);
      await tweet.save();
    } else {
      // データベースにツイートが存在しない場合は、代替としてモジュールストレージへ保存
      try {
        let data = await this.moduleStorage.get(`_unrelatedTweetsStorage-${tweetId}`);
        if (data) moduleData = data;
      } catch (e) {}
      moduleData[key] = value;
      await this.moduleStorage.set(`_unrelatedTweetsStorage-${tweetId}`, moduleData);
    }
  }

  /**
   * 指定されたキーからのIDの取得
   * (データベースへ保存するためのIDの取得)
   * @param key キー
   */
  private getIdByKey(key: string): string {
    return `${this.moduleName}::${this.id}::${key.replace(/::/g, '').toLowerCase()}`;
  }
}
