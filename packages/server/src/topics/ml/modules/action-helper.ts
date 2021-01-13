import { BaseHelper } from './base-helper';
import * as Twitter from 'twitter';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';

export class ActionHelper extends BaseHelper {
  private constructor(
    protected moduleName: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
    protected actionIndex: number,
  ) {
    super(moduleName, moduleStorage, moduleSetting, socialAccount);
  }

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    actionIndex: number,
  ): Readonly<ActionHelper> => {
    return new ActionHelper(moduleName, moduleStorage, moduleSetting, socialAccount, actionIndex);
  };

  /**
   * 自分自身のアクションのインデックス番号の取得
   */
  getOwnActionIndex(): number {
    return this.actionIndex;
  }
}
