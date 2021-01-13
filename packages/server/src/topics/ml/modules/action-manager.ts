import * as fs from 'fs';
import { Repository } from 'typeorm';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { ActionHelper } from './action-helper';
import { ModuleStorage } from './module-storage';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ExtractedTweet } from '../entities/extracted-tweet.entity';
import { Action } from './actions/interfaces/action.interface';
import { PostToDiscordAction } from './actions/post-to-discord-action';
import { WaitForSecondsAction } from './actions/wait-for-seconds-action';

/**
 * アクションモジュールを管理するためのクラス
 */
export class ActionManager {
  /**
   * コンストラクタ
   * @param moduleStorageRepository モジュールストレージを読み書きするためのリポジトリ
   * @param socialAccountRepository ソーシャルアカウントを読み書きするためのリポジトリ
   * @param actionSettings アクション設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。キーワードを用いて何か処理を行うために使用される。)
   */
  constructor(
    private moduleStorageRepository: Repository<ModuleStorageEntity.ModuleStorage>,
    private socialAccountRepository: Repository<SocialAccount>,
    private actionSettings: { [key: string]: any }[],
    private topicKeywords: string[],
  ) {}

  /**
   * 利用可能なアクションモジュール名の取得
   */
  async getAvailableModuleNames(): Promise<string[]> {
    // アクションのモジュールディレクトリからディレクトリを列挙
    let moduleDirNames: string[] = await new Promise((resolve, reject) => {
      fs.readdir(`${__dirname}/actions/`, (err, files) => {
        let directories: string[] = [];
        files
          .filter(filePath => {
            return !fs.statSync(`${__dirname}/actions/${filePath}`).isFile();
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
   * 指定されたツイートに対するアクションの実行
   * @param tweet ツイート
   * @return アクションが完了したか否か (実行すべきアクションがなければ null)
   */
  async execActionToTweet(tweet: ExtractedTweet): Promise<boolean | null> {
    let completeActionIndex = tweet.completeActionIndex;

    // 当該ツイートに対して実行すべきアクションを取得
    const nextActionIndex = completeActionIndex + 1;
    const numOfActions = this.actionSettings.length;
    console.log(numOfActions, nextActionIndex);
    if (numOfActions <= nextActionIndex) {
      // 次に実行すべきアクションがなければ
      return null;
    }

    const nextAction = this.actionSettings[nextActionIndex];

    // アクションを初期化
    const mod: Action = await this.getModule(nextAction.name, nextActionIndex);
    if (mod === null) {
      throw new Error(`[ActionManager] - actionTweet - This action was invalid... ${nextAction.name}`);
    }

    // 当該アクションでアクションを実行
    const isCompleted = await mod.execAction(tweet);

    // アクションが完了したか否かを返す
    return isCompleted;
  }

  /**
   * 指定されたアクションモジュールの取得
   * @param actionName アクション名
   * @param actionIndex アクションのインデックス番号
   */
  async getModule(actionName: string, actionIndex: number = -1) {
    // ModuleStorage の初期化
    const moduleStorage = ModuleStorage.factory(actionName, this.moduleStorageRepository);

    // ソーシャルアカウントの取得
    // TODO: 複数アカウントの対応
    const socialAccounts = await this.socialAccountRepository.find();
    const socialAccount = socialAccounts[0];

    // アクション設定の取得
    let actionSetting = [];
    if (actionIndex != -1) {
      actionSetting = this.actionSettings[actionIndex].settings;
    }

    // ヘルパの初期化
    const moduleHelper = ActionHelper.factory(actionName, moduleStorage, actionSetting, socialAccount, actionIndex);

    // モジュールの初期化
    // NOTE: ツイートフィルタと異なり、アクションはツイートごとにモジュールおよびヘルパを初期化する
    switch (actionName) {
      case 'PostToDiscordAction':
        return new PostToDiscordAction(moduleHelper);
      case 'WaitForSecondsAction':
        return new WaitForSecondsAction(moduleHelper);
    }

    return null;
  }
}
