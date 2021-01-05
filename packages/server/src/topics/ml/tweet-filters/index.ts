import * as fs from 'fs';
import { TweetRetweetsFilter } from './tweet-retweets-filter';
import { TweetLikesFilter } from './tweet-likes-filter';

export class TweetFilterManager {
  private modules: any[] = [];

  constructor() {
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

  async filterTweetByFilterSettings(tweet: any, filterSettings: any[]) {
    // 当該ツイートに対する全フィルタの適用結果を代入するための配列
    let allFiltersResults = [];

    // フィルタ設定を反復
    for (const filter of filterSettings) {
      const mod = this.getModule(filter.name, filter.setting);
      if (mod === null) {
        console.log(`[TweetFilters] - filterTweetByFilterSettings - This filter was invalid... ${filter.name}`);
        continue;
      }
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

    switch (filterName) {
      case 'TweetLikesFilter':
        this.modules[filterName] = new TweetLikesFilter(filterSetting);
        return this.modules[filterName];
      case 'TweetRetweetsFilter':
        this.modules[filterName] = new TweetRetweetsFilter(filterSetting);
        return this.modules[filterName];
    }

    return null;
  }
}
