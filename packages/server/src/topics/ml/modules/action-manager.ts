import * as fs from 'fs';
import { Repository } from 'typeorm';
import * as ModuleStorageEntity from '../entities/module-storage.entity';
import { ActionHelper } from './module-helpers/action.helper';
import { ModuleStorage } from './module-storage';
import { ModuleTweetStorage } from './module-tweet-storage';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ClassifiedTweet } from '../entities/classified-tweet.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { ManagerHelper } from './manager.helper';

/**
 * アクションモジュールを管理するためのクラス
 */
export class ActionManager {
  /**
   * コンストラクタ
   * @param moduleStorageRepository モジュールストレージを読み書きするためのリポジトリ
   * @param classifiedTweetRepository 分類済みツイートを読み書きするためのリポジトリ
   * @param socialAccountRepository ソーシャルアカウントを読み書きするためのリポジトリ
   * @param actionSettings アクション設定
   * @param topicKeywords トピックのキーワード (実際に検索が行われるわけではない。キーワードを用いて何か処理を行うために使用される。)
   */
  constructor(
    private moduleStorageRepository: Repository<ModuleStorageEntity.ModuleStorage>,
    private classifiedTweetRepository: Repository<ClassifiedTweet>,
    private socialAccountRepository: Repository<SocialAccount>,
    private actionSettings: { [key: string]: any }[],
    private topicKeywords: string[],
  ) {}

  /**
   * 利用可能なアクション名の取得
   */
  async getAvailableActionNames(): Promise<string[]> {
    return await ManagerHelper.getAvailableActionNames();
  }

  /**
   * 指定されたツイートに対するアクションの実行
   * @param tweet ツイート
   * @param topic トピック
   * @return アクションが完了したか否か (実行すべきアクションがなければ null)
   */
  async execActionToTweet(tweet: ClassifiedTweet, topic: Topic): Promise<boolean | null> {
    let completeActionIndex = tweet.completeActionIndex;

    // 当該ツイートに対して実行すべきアクションを取得
    const nextActionIndex = completeActionIndex + 1;
    const numOfActions = this.actionSettings.length;
    if (numOfActions <= nextActionIndex) {
      // 次に実行すべきアクションがなければ
      return null;
    }

    const nextAction = this.actionSettings[nextActionIndex];

    // アクションを初期化
    const mod: any = await this.getModule(nextAction.actionName, nextAction.id, nextActionIndex, topic);
    if (mod === null) {
      throw new Error(`[ActionManager] - actionTweet - This action was invalid... ${nextAction.actionName}`);
    } else if (mod.execAction === undefined) {
      // 単体アクション実行に非対応ならば
      return false;
    }

    // 当該アクションでアクションを実行
    const isCompleted = await mod.execAction(tweet);

    // アクションが完了したか否かを返す
    return isCompleted;
  }

  /**
   * 指定されたアクションモジュールの取得
   * @param actionName アクション名
   * @param actionId   アクションID (モジュールストレージを分離するための識別子)
   * @param actionIndex アクションのインデックス番号
   * @param topic トピック
   */
  async getModule(actionName: string, actionId: string, actionIndex = -1, topic: Topic) {
    // ModuleStorage の初期化
    const moduleStorage = await ModuleStorage.factory(`Action${actionName}`, actionId, this.moduleStorageRepository);

    // ModuleTweetStorage の初期化
    const moduleTweetStorage = ModuleTweetStorage.factory(
      `Action${actionName}`,
      actionId,
      this.classifiedTweetRepository,
      moduleStorage,
    );

    // ソーシャルアカウントの取得
    // TODO: 複数アカウントの対応
    const socialAccounts = await this.socialAccountRepository.find();
    const socialAccount = socialAccounts[0];

    // アクション設定の取得
    let actionSetting = [];
    if (actionIndex != null) {
      actionSetting = this.actionSettings[actionIndex].settings;
    }

    // ヘルパの初期化
    const moduleHelper = ActionHelper.factory(
      `Action${actionName}`,
      actionId,
      moduleStorage,
      moduleTweetStorage,
      actionSetting,
      socialAccount,
      topic,
      actionIndex,
    );

    // モジュールの初期化
    // NOTE: ツイートフィルタと異なり、アクションはツイートごとにモジュールおよびヘルパを初期化する
    const moduleDirectoryPath = await ManagerHelper.getDirectoryPathByActionName(actionName);
    if (!moduleDirectoryPath) {
      throw new Error(`There is no matched module (actionName = ${actionName}).`);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(moduleDirectoryPath);
    if (mod.default === undefined) {
      throw new Error(`There is no default export on action (path = ${moduleDirectoryPath}).`);
    }
    return new mod.default(moduleHelper);
  }
}
