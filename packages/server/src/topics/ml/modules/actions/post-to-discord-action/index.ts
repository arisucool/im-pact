import { Action } from '../interfaces/action.interface';
import { ActionHelper } from '../../action-helper';
import { ExtractedTweet } from 'src/topics/ml/entities/extracted-tweet.entity';
import axios from 'axios';

export class PostToDiscordAction implements Action {
  constructor(private helper: Readonly<ActionHelper>) {}

  getDescription() {
    return 'ツイートを Discord へ投稿するアクション';
  }

  getSettingsDefinition() {
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
        placeholder: `例: ツイートを収集しました
%TWEET_URL%`,
        templateVariables: {
          TWEET_URL: 'ツイートのURL',
          TWEET_TEXT: 'ツイートの本文',
          TWEET_USER_NAME: 'ツイートのユーザ名　(例: ありす)',
          TWEET_USER_DISPLAY_NAME: 'ツイートのユーザ表示名　(例: arisucool)',
        },
      },
    ];
  }

  async execAction(tweet: ExtractedTweet): Promise<boolean> {
    // 設定を取得
    const webhookUrl = this.helper.getSetting().webhookUrl;
    if (!webhookUrl) throw new Error('Discord Webhook URL が未指定です');
    const contentTemplate = this.helper.getSetting().contentTemplate || '';

    // 投稿本文を生成
    const content = contentTemplate
      .replace(/%TWEET_URL%/g, tweet.url)
      .replace(/%TWEET_TEXT%/g, tweet.text)
      .replace(/%TWEET_USER_NAME%/g, tweet.userName)
      .replace(/%TWEET_USER_SCREEN_NAME%/g, tweet.userScreenName);

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
    return true;
  }
}
