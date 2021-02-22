import { Action, ActionHelper, ActionSettingsDefinition, ClassifiedTweet } from '@arisucool/im-pact-core';
import axios from 'axios';

export default class ApproveOnDiscordAction implements Action {
  constructor(private helper: Readonly<ActionHelper>) {}

  getDescription() {
    return 'ツイートを Discord へ投稿し、次のアクションへ遷移するか承認を得るアクション';
  }

  getSettingsDefinition(): ActionSettingsDefinition[] {
    return [
      {
        name: 'webhookUrl',
        title: 'Discord Webhook URL',
        type: 'url',
        placeholder: '例: https://discord.com/api/webhooks/000000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      {
        name: 'contentTemplate',
        title: '投稿本文',
        type: 'textarea',
        rows: 6,
        placeholder: `例: ツイートを収集しました。承認しますか？
%TWEET_URL%

承認: %ACCEPT_URL%
拒否: %REJECT_URL%`,
        templateVariables: {
          TWEET_URL: 'ツイートのURL',
          TWEET_TEXT: 'ツイートの本文',
          TWEET_USER_NAME: 'ツイートのユーザ名　(例: ありす)',
          TWEET_USER_SCREEN_NAME: 'ツイートのユーザ表示名　(例: arisucool)',
          ACCEPT_URL: '承認用URL',
          REJECT_URL: '拒否用URL',
        },
      },
    ];
  }

  async execAction(tweet: ClassifiedTweet): Promise<boolean> {
    // 前回実行されたアクションを確認
    console.log(this.helper.getOwnActionIndex(), tweet.lastActionIndex);
    if (this.helper.getOwnActionIndex() === tweet.lastActionIndex && !tweet.lastActionError) {
      // 前回実行されたアクションが自身であり、エラーでなかったならば、そのまま保留を継続
      return false;
    }

    // 設定を取得
    const webhookUrl = this.helper.getSetting().webhookUrl;
    if (!webhookUrl) throw new Error('Discord Webhook URL が未指定です');
    const contentTemplate = this.helper.getSetting().contentTemplate || '';

    // 投稿本文を生成
    const content = contentTemplate
      .replace(/%TWEET_URL%/g, tweet.url)
      .replace(/%TWEET_TEXT%/g, tweet.text)
      .replace(/%TWEET_USER_NAME%/g, tweet.userName)
      .replace(/%TWEET_USER_SCREEN_NAME%/g, tweet.userScreenName)
      .replace(/%ACCEPT_URL%/g, this.helper.getAcceptUrlByTweet(tweet))
      .replace(/%REJECT_URL%/g, this.helper.getRejectUrlByTweet(tweet));

    // 投稿を実行
    const res = await axios.post(
      webhookUrl,
      {
        username: 'im pact',
        content: content,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-type': 'application/json',
        },
      },
    );

    // 完了
    // (承認用URLまたは拒否用URLにより次のアクションへ遷移するので、ここでは常に保留を返す)
    return false;
  }
}
