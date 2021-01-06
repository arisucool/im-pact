import * as fs from 'fs';
import { TweetRetweetsFilter } from './tweet-retweets-filter';
import { TweetLikesFilter } from './tweet-likes-filter';
import { TweetAuthorProfileLikeFoloweeBayesianFilter } from './tweet-author-profile-like-folowee-bayesian-filter';
import { TweetTextBayesianFilter } from './tweet-text-bayesian-filter';
import { Repository } from 'typeorm';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { ModuleStorage } from './module-storage';

export class TweetFilterManager {
  private modules: any[] = [];

  constructor(private repository: Repository<ModuleStorageEntity.ModuleStorage>) {
    this.modules = [];
  }

  /**
   * 利用可能なモジュール名の取得
   */
  async getAvailableModuleNames(): Promise<string[]> {
    // ツイートフィルタのモジュールディレクトリからディレクトリを列挙
    let moduleDirNames: string[] = await new Promise((resolve, reject) => {
      fs.readdir(`${__dirname}/`, (err, files) => {
        let directories: string[] = [];
        files
          .filter(filePath => {
            return !fs.statSync(`${__dirname}/${filePath}`).isFile();
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

  async trainTweet(tweet: any, isSelected: boolean, filterSettings: any[]) {
    // フィルタ設定を反復
    for (const filter of filterSettings) {
      // ツイートフィルタを初期化
      const mod = this.getModule(filter.name, filter.setting);
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

  async filterTweetByFilterSettings(tweet: any, filterSettings: any[]) {
    // 当該ツイートに対する全フィルタの適用結果を代入するための配列
    let allFiltersResults = [];

    // フィルタ設定を反復
    for (const filter of filterSettings) {
      // ツイートフィルタを初期化
      const mod = this.getModule(filter.name, filter.setting);
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

  getModule(filterName: string, filterSetting: any) {
    if (this.modules[filterName]) return this.modules[filterName];

    // ModuleStorage の初期化
    const moduleStorage = new ModuleStorage(filterName, this.repository);

    // モジュールの初期化
    switch (filterName) {
      case 'TweetAuthorProfileLikeFoloweeBayesianFilter':
        this.modules[filterName] = new TweetAuthorProfileLikeFoloweeBayesianFilter(filterSetting, moduleStorage);
        return this.modules[filterName];
      case 'TweetLikesFilter':
        this.modules[filterName] = new TweetLikesFilter(filterSetting, moduleStorage);
        return this.modules[filterName];
      case 'TweetRetweetsFilter':
        this.modules[filterName] = new TweetRetweetsFilter(filterSetting, moduleStorage);
        return this.modules[filterName];
      case 'TweetTextBayesianFilter':
        this.modules[filterName] = new TweetTextBayesianFilter(filterSetting, moduleStorage);
        return this.modules[filterName];
    }

    return null;
  }
}
