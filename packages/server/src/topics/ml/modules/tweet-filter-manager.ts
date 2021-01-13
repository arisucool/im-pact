import * as fs from 'fs';
import { Repository } from 'typeorm';
import { TweetFilterHelper } from './tweet-filter-helper';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { TweetFilter } from './tweet-filters/interfaces/tweet-filter.interface';
import { TweetFilterBatch } from './tweet-filters/interfaces/tweet-filter-batch.interface';
import { TweetFilterTrain } from './tweet-filters/interfaces/tweet-filter-train.interface';
import { TweetRetweetsFilter } from './tweet-filters/tweet-retweets-filter';
import { TweetLikesFilter } from './tweet-filters/tweet-likes-filter';
import { TweetAuthorProfileLikeFoloweeBayesianFilter } from './tweet-filters/tweet-author-profile-like-folowee-bayesian-filter';
import { TweetTextBayesianFilter } from './tweet-filters/tweet-text-bayesian-filter';
import { TfIllustImageClassificationFilter } from './tweet-filters/tf-illust-image-classification-filter';

/**
 * ツイートフィルタモジュールを管理するためのクラス
 */
export class TweetFilterManager {
  private modules: any[] = [];

  /**
   * コンストラクタ
   * @param moduleStorageRepository モジュールストレージを読み書きするためのリポジトリ
   * @param socialAccountRepository ソーシャルアカウントを読み書きするためのリポジトリ
   * @param filterSettings ツイートフィルタ設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)
   */
  constructor(
    private moduleStorageRepository: Repository<ModuleStorageEntity.ModuleStorage>,
    private socialAccountRepository: Repository<SocialAccount>,
    private filterSettings: { [key: string]: any }[],
    private topicKeywords: string[],
  ) {
    this.modules = [];
  }

  /**
   * 利用可能なモジュール名の取得
   */
  async getAvailableModuleNames(): Promise<string[]> {
    // ツイートフィルタのモジュールディレクトリからディレクトリを列挙
    let moduleDirNames: string[] = await new Promise((resolve, reject) => {
      fs.readdir(`${__dirname}/tweet-filters/`, (err, files) => {
        let directories: string[] = [];
        files
          .filter(filePath => {
            return !fs.statSync(`${__dirname}/tweet-filters/${filePath}`).isFile();
          })
          .filter(filePath => {
            return filePath !== 'interfaces';
          })
          .forEach(filePath => {
            directories.push(filePath);
          });
        resolve(directories);
      });
    });
    // 各ディレクトリ名をモジュール名 (キャメルケース) へ変換
    moduleDirNames = moduleDirNames.map(str => {
      let arr = str.split('-');
      let capital = arr.map((item, index) =>
        index ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase() : item.toLowerCase(),
      );
      let lowerCamelChars = capital.join('').split('');
      lowerCamelChars[0] = lowerCamelChars[0].toUpperCase();
      return lowerCamelChars.join('');
    });
    return moduleDirNames;
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
      const mod = (await this.getModule(filter.name)) as TweetFilterTrain;
      if (mod === null) {
        console.log(`[TweetFilters] - trainTweet - This filter was invalid... ${filter.name}`);
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
          `[TweetFilters] trainTweet - Error occurred during the training process on the tweet filter... ${filter.name}\n${e.stack}`,
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
      const mod = (await this.getModule(filter.name)) as TweetFilterBatch;
      if (mod === null) {
        console.log(`[TweetFilters] - batchByFilterSettings - This filter was invalid... ${filter.name}`);
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
      const mod: TweetFilter = await this.getModule(filter.name);
      if (mod === null) {
        console.log(`[TweetFilters] - filterTweetByFilterSettings - This filter was invalid... ${filter.name}`);
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
   */
  async getModule(filterName: string): Promise<TweetFilter | TweetFilterBatch | TweetFilterTrain> {
    if (this.modules[filterName]) return this.modules[filterName];

    // ModuleStorage の初期化
    const moduleStorage = ModuleStorage.factory(filterName, this.moduleStorageRepository);

    // ソーシャルアカウントの取得
    // TODO: 複数アカウントの対応
    const socialAccounts = await this.socialAccountRepository.find();
    const socialAccount = socialAccounts[0];

    // フィルタ設定の取得
    let filterSetting = {};
    this.filterSettings.find(item => {
      if (item.name === filterName) return true;
    });

    // ヘルパの初期化
    const moduleHelper = TweetFilterHelper.factory(
      filterName,
      moduleStorage,
      filterSetting,
      socialAccount,
      this.topicKeywords,
    );

    // モジュールの初期化
    switch (filterName) {
      case 'TfIllustImageClassificationFilter':
        this.modules[filterName] = new TfIllustImageClassificationFilter(moduleHelper);
        return this.modules[filterName];
      case 'TweetAuthorProfileLikeFoloweeBayesianFilter':
        this.modules[filterName] = new TweetAuthorProfileLikeFoloweeBayesianFilter(moduleHelper);
        return this.modules[filterName];
      case 'TweetLikesFilter':
        this.modules[filterName] = new TweetLikesFilter(moduleHelper);
        return this.modules[filterName];
      case 'TweetRetweetsFilter':
        this.modules[filterName] = new TweetRetweetsFilter(moduleHelper);
        return this.modules[filterName];
      case 'TweetTextBayesianFilter':
        this.modules[filterName] = new TweetTextBayesianFilter(moduleHelper);
        return this.modules[filterName];
    }

    return null;
  }
}
