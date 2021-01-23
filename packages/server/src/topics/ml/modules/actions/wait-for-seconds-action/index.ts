import { Action, ActionSettingsDefinition } from '../interfaces/action.interface';
import { ActionHelper } from '../../action-helper';
import { ExtractedTweet } from 'src/topics/ml/entities/extracted-tweet.entity';

export class WaitForSecondsAction implements Action {
  constructor(private helper: Readonly<ActionHelper>) {}

  getDescription() {
    return '指定した時間が経過したら次のアクションへ遷移するアクション';
  }

  getSettingsDefinition(): ActionSettingsDefinition[] {
    return [
      {
        name: 'waitSeconds',
        title: '待機秒数',
        type: 'number',
        placeholder: '例: 3600 (1時間)',
      },
    ];
  }

  async execAction(tweet: ExtractedTweet): Promise<boolean> {
    // 設定を取得
    const waitSeconds = this.helper.getSetting().waitSeconds;
    if (!waitSeconds || waitSeconds < 0) {
      throw new Error('待機秒数が正しくありません');
    }

    // 前回実行されたアクションを確認
    if (this.helper.getOwnActionIndex() !== tweet.lastActionIndex) {
      // 前回実行されたアクションが自身でなければ、保留
      return false;
    }

    // 前回実行からの経過時間を算出
    const diffSeconds = (new Date().getTime() - tweet.lastActionExecutedAt.getTime()) / 1000;
    if (diffSeconds <= waitSeconds) {
      // 待機秒数を満たしていなければ、保留
      return false;
    }

    // 完了 (次のアクションへ遷移することを許可)
    return true;
  }
}
