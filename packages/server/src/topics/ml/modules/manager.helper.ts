import * as fs from 'fs';
import * as path from 'path';
import * as appRoot from 'app-root-path';

export class ManagerHelper {
  private static ACTION_MODULE_PREFIX = 'im-pact-action-';

  private static TWEET_FILTER_MODULE_PREFIX = 'im-pact-filter-';

  private static APP_ROOT_DIRECTORY = `${__dirname}/../../../../`;
  private static MODULE_FIND_DIRECTORIES = [
    // 1. /module_packages/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/../../module_packages/`,
    // 2. /packages/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/../`,
    // 3. /packages/server/node_modules/@arisucool/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/node_modules/@arisucool/`,
    // 4. /packages/server/node_modules/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/node_modules/`,
    // 5. /node_modules/@arisucool/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/../../node_modules/@arisucool/`,
    // 6. /node_modules/ ディレクトリ
    `${ManagerHelper.APP_ROOT_DIRECTORY}/../../node_modules/`,
  ];

  /**
   * 利用可能なアクション名の取得
   * @return アクション名の配列
   */
  public static async getAvailableActionNames() {
    let dirs = [];
    for (const dirPath of this.MODULE_FIND_DIRECTORIES) {
      dirs = dirs.concat(
        await ManagerHelper.getAvailableModuleDirecoriesByDirectory(dirPath, ManagerHelper.ACTION_MODULE_PREFIX),
      );
    }

    // ディレクトリパスからアクション名へ変換
    dirs = dirs.map((moduleDirPath: string) => {
      return ManagerHelper.kebabCaseToUpperCamelCase(
        path.basename(moduleDirPath).replace(new RegExp(`^${ManagerHelper.ACTION_MODULE_PREFIX}`), ''),
      );
    });

    // 重複除去して返す
    return Array.from(new Set(dirs));
  }

  /**
   * 利用可能なツイートフィルタ名の取得
   * @return ツイートフィルタ名の配列
   */
  public static async getAvailableTweetFilterNames() {
    let dirs = [];
    for (const dirPath of this.MODULE_FIND_DIRECTORIES) {
      dirs = dirs.concat(
        await ManagerHelper.getAvailableModuleDirecoriesByDirectory(dirPath, ManagerHelper.TWEET_FILTER_MODULE_PREFIX),
      );
    }

    // ディレクトリパスからツイートフィルタ名へ変換
    dirs = dirs.map((moduleDirPath: string) => {
      return ManagerHelper.kebabCaseToUpperCamelCase(
        path.basename(moduleDirPath).replace(new RegExp(`^${ManagerHelper.TWEET_FILTER_MODULE_PREFIX}`), ''),
      );
    });

    // 重複除去して返す
    return Array.from(new Set(dirs));
  }

  /**
   * 指定したアクション名によるモジュールディレクトリの取得
   * @param actionName アクション名 (例: 'Foo')
   * @return ディレクトリパス
   */
  public static async getDirectoryPathByActionName(actionName: string) {
    return await ManagerHelper.getDirectoryPathByActionModuleName(`ImPactAction${actionName}`);
  }

  /**
   * 指定したアクションモジュール名によるモジュールディレクトリの取得
   * @param moduleName アクションモジュール名 (例: 'ImPactActionFoo')
   * @return ディレクトリパス
   */
  private static async getDirectoryPathByActionModuleName(moduleName: string) {
    // モジュール名からモジュールパス名を取得
    const modulePathName = ManagerHelper.upperCamelCaseToKebabCase(moduleName);

    // 検索ディレクトリを検索してモジュールディレクトリを列挙
    let moduleDirPath = null;
    for (const dirPath of this.MODULE_FIND_DIRECTORIES) {
      const results = await ManagerHelper.getAvailableModuleDirecoriesByDirectory(
        dirPath,
        ManagerHelper.ACTION_MODULE_PREFIX,
      );

      // 当該検索ディレクトリから一致するモジュールディレクトリを探す
      moduleDirPath = results.find(dirPath => {
        return path.basename(dirPath) === modulePathName;
      });

      if (moduleDirPath) break;
    }

    // ディレクトリパスを返す
    return moduleDirPath;
  }

  /**
   * 指定したツイートフィルタ名によるモジュールディレクトリの取得
   * @param tweetFilterName ツイートフィルタ名 (例: 'Foo')
   * @return ディレクトリパス
   */
  public static async getDirectoryPathByTweetFilterName(tweetFilterName: string) {
    return await ManagerHelper.getDirectoryPathByTweetFilterModuleName(`ImPactFilter${tweetFilterName}`);
  }

  /**
   * 指定したツイートフィルタモジュール名によるモジュールディレクトリの取得
   * @param moduleName ツイートフィルタモジュール名 (例: 'ImpactFilterFoo')
   * @return ディレクトリパス
   */
  private static async getDirectoryPathByTweetFilterModuleName(moduleName: string) {
    // モジュール名からモジュールパス名を取得
    const modulePathName = ManagerHelper.upperCamelCaseToKebabCase(moduleName);

    // 検索ディレクトリを検索してモジュールディレクトリを列挙
    let moduleDirPath = null;
    for (const dirPath of this.MODULE_FIND_DIRECTORIES) {
      const results = await ManagerHelper.getAvailableModuleDirecoriesByDirectory(
        dirPath,
        ManagerHelper.TWEET_FILTER_MODULE_PREFIX,
      );

      // 当該検索ディレクトリから一致するモジュールディレクトリを探す
      moduleDirPath = results.find(dirPath => {
        return path.basename(dirPath) === modulePathName;
      });

      if (moduleDirPath) break;
    }

    // ディレクトリパスを返す
    return moduleDirPath;
  }

  /**
   * 利用可能なモジュール名の取得
   * @param directoryPath 検索ディレクトリのパス
   * @param prefix  ディレクトリの接頭辞
   * @return モジュール名の配列
   */
  private static async getAvailableModuleNamesByDirectory(directoryPath: string, prefix: string): Promise<string[]> {
    // 検索ディレクトリを検索してモジュールディレクトリを列挙
    const moduleDirPaths = await ManagerHelper.getAvailableModuleDirecoriesByDirectory(directoryPath, prefix);

    // ディレクトリ名のみを抽出
    const moduleDirNames = moduleDirPaths.map((dirPath: string) => {
      return path.basename(dirPath);
    });

    // 各ディレクトリ名をモジュール名 (キャメルケース) へ変換
    const moduleNames = moduleDirNames.map(str => {
      return ManagerHelper.kebabCaseToUpperCamelCase(str);
    });
    return moduleNames;
  }

  /**
   * 利用可能なモジュールのディレクトリパスの取得
   * @param directoryPath 検索ディレクトリのパス
   * @param prefix  ディレクトリの接頭辞
   * @return モジュールのディレクトリパスの配列
   */
  private static async getAvailableModuleDirecoriesByDirectory(
    directoryPath: string,
    prefix: string,
  ): Promise<string[]> {
    if (!fs.existsSync(directoryPath)) {
      return [];
    }

    // アクションのモジュールディレクトリからディレクトリを列挙
    let moduleDirPaths: string[] = await new Promise((resolve, reject) => {
      fs.readdir(directoryPath, (err, files) => {
        if (err) return reject(err);

        let directories: string[] = [];
        files
          // ファイルでないこと
          .filter(name => {
            return !fs.statSync(`${directoryPath}${name}`).isFile();
          })
          // 接頭辞および接尾字に一致すること
          .filter(name => {
            return name.match(new RegExp(`^${prefix}(.+)$`));
          })
          .forEach(name => {
            directories.push(`${directoryPath}${name}`);
          });

        resolve(directories);
      });
    });
    return moduleDirPaths;
  }

  /**
   * アッパーキャメルケースからケバブケースへの変換
   * @param str アッパーキャメルケースの文字列
   */
  private static upperCamelCaseToKebabCase(str: string) {
    return str
      .replace(/\.?([A-Z])/g, function(x, y) {
        return '-' + y.toLowerCase();
      })
      .replace(/^\-/, '');
  }

  /**
   * ケバブケースからアッパーキャメルケースへの変換
   * @param str ケバブケースの文字列
   */
  private static kebabCaseToUpperCamelCase(str: string) {
    let arr = str.split('-');
    let capital = arr.map((item, index) =>
      index ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase() : item.toLowerCase(),
    );
    let lowerCamelChars = capital.join('').split('');
    lowerCamelChars[0] = lowerCamelChars[0].toUpperCase();
    return lowerCamelChars.join('');
  }
}
