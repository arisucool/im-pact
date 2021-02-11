import * as fs from 'fs';
import { Repository } from 'typeorm';
import { TweetFilterHelper } from './module-helpers/tweet-filter.helper';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { ModuleTweetStorage } from './module-tweet-storage';
import { CrawledTweet } from '../entities/crawled-tweet.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { TweetFilter } from './tweet-filters/interfaces/tweet-filter.interface';
import { TweetFilterBatch } from './tweet-filters/interfaces/tweet-filter-batch.interface';
import { TweetFilterTrain } from './tweet-filters/interfaces/tweet-filter-train.interface';
import { ManagerHelper } from './manager.helper';

/**
 * ツイートフィルタモジュールを管理するためのクラス
 */
export class TweetFilterManager {
  private modules: any[] = [];

  /**
   * コンストラクタ
   * @param moduleStorageRepository モジュールストレージを読み書きするためのリポジトリ
   * @param crawledTweetRepository 収集済みツイートを読み書きするためのリポジトリ
   * @param socialAccountRepository ソーシャルアカウントを読み書きするためのリポジトリ
   * @param filterSettings ツイートフィルタ設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)
   */
  constructor(
    private moduleStorageRepository: Repository<ModuleStorageEntity.ModuleStorage>,
    private crawledTweetRepository: Repository<CrawledTweet>,
    private socialAccountRepository: Repository<SocialAccount>,
    private filterSettings: { id: string; filterName: string; settings: { [key: string]: any } }[],
    private topicKeywords: string[],
  ) {
    this.modules = [];
  }

  /**
   * 利用可能なツイートフィルタ名の取得
   */
  async getAvailableTweetFilterNames(): Promise<string[]> {
    return await ManagerHelper.getAvailableTweetFilterNames();
  }

  /**
   * 指定されたツイートに対する学習の実行
   * @param tweet ツイート
   * @param isSelected ツイートが選択されたか否か
   */
  async trainTweet(tweet: any, isSelected: boolean): Promise<void> {
    // フィルタ設定を反復
    for (const filter of this.filterSettings) {
      // ツイートフィルタを初期化
      const mod = (await this.getModule(filter.filterName, filter.id, filter.settings)) as TweetFilterTrain;
      if (mod === null) {
        console.log(`[TweetFilters] - trainTweet - This filter was invalid... ${filter.filterName}`);
        continue;
      }

      if (typeof mod.train !== 'function') {
        // 関数でなければ
        continue;
      }

      // 当該ツイートフィルタで学習を実行
      try {
        await mod.train(tweet, isSelected);
      } catch (e) {
        console.warn(
          `[TweetFilters] trainTweet - Error occurred during the training process on the tweet filter... ${filter.filterName}\n${e.stack}`,
        );
      }
    }
  }

  /**
   * 全てのツイートフィルタに対するバッチ処理の実行
   */
  async batch(): Promise<void> {
    // フィルタ設定を反復
    for (const filter of this.filterSettings) {
      // ツイートフィルタを初期化
      const mod = (await this.getModule(filter.filterName, filter.id, filter.settings)) as TweetFilterBatch;
      if (mod === null) {
        console.log(`[TweetFilters] - batchByFilterSettings - This filter was invalid... ${filter.filterName}`);
        continue;
      }

      if (typeof mod.batch !== 'function') {
        // 関数でなければ
        continue;
      }

      // 当該ツイートフィルタでバッチを実行
      await mod.batch();
    }
  }

  /**
   * 指定されたツイートに対するフィルタの実行
   * @param tweet ツイート
   * @return ツイートフィルタの実行結果
   */
  async filterTweet(tweet: any): Promise<number[]> {
    // 当該ツイートに対する全フィルタの適用結果を代入するための配列
    let allFiltersResults = [];

    // フィルタ設定を反復
    for (const filter of this.filterSettings) {
      // ツイートフィルタを初期化
      const mod: TweetFilter = await this.getModule(filter.filterName, filter.id, filter.settings);
      if (!mod) {
        console.log(`[TweetFilters] - filterTweetByFilterSettings - This filter was invalid... ${filter.filterName}`);
        continue;
      }
      // 当該ツイートフィルタでフィルタを実行
      const filterResult = await mod.filter(tweet);
      allFiltersResults.push(filterResult);
    }

    if (allFiltersResults.length === 0) {
      throw new Error('There is no valid filters.');
    }

    return allFiltersResults;
  }

  /**
   * 指定されたツイートフィルタモジュールの取得
   * @param filterName ツイートフィルタ名
   * @param filterId   ツイートフィルタID (モジュールストレージを分離するための識別子)
   * @param filterSetting ツイートフィルタの設定
   */
  async getModule(
    filterName: string,
    filterId: string,
    filterSetting: { [key: string]: any },
  ): Promise<TweetFilter | TweetFilterBatch | TweetFilterTrain> {
    if (filterId && this.modules[filterId]) return this.modules[filterId];

    // ModuleStorage の初期化
    const moduleStorage = await ModuleStorage.factory(`Filter${filterName}`, filterId, this.moduleStorageRepository);

    // ModuleTweetStorage の初期化
    const moduleTweetStorage = ModuleTweetStorage.factory(
      `Filter${filterName}`,
      filterId,
      this.crawledTweetRepository,
      moduleStorage,
    );

    // ソーシャルアカウントの取得
    // TODO: 複数アカウントの対応
    const socialAccounts = await this.socialAccountRepository.find();
    const socialAccount = socialAccounts[0];

    // ヘルパの初期化
    const moduleHelper = TweetFilterHelper.factory(
      `Filter${filterName}`,
      filterId,
      moduleStorage,
      moduleTweetStorage,
      filterSetting,
      socialAccount,
      this.topicKeywords,
    );

    // モジュールの初期化
    const moduleDirectoryPath = await ManagerHelper.getDirectoryPathByTweetFilterName(filterName);
    if (!moduleDirectoryPath) {
      throw new Error(`There is no matched module (filterName = ${filterName}).`);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(moduleDirectoryPath);
    if (mod.default === undefined) {
      throw new Error(`There is no default export on tweet filter (path = ${moduleDirectoryPath}).`);
    }

    if (!filterId) return new mod.default(moduleHelper);

    this.modules[filterId] = new mod.default(moduleHelper);
    return this.modules[filterId];
  }
}
