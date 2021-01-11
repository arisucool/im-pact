import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TopicsService } from '../../topics.service';

/**
 * お手本分類ダイアログのコンポーネント
 */
@Component({
  selector: 'app-trainer-dialog',
  templateUrl: './trainer-dialog.component.html',
  styleUrls: ['./trainer-dialog.component.scss'],
})
export class TrainerDialogComponent implements OnInit {
  // 教師データ生成用のサンプルツイートの収集数
  public static NUM_OF_REQUEST_SAMPLE_TWEETS = 100;
  // Twitter の検索条件
  public crawlSocialAccountId: number;
  public keywords: string[];
  // Twitter の検索結果
  public tweets: any[];
  public numOfSelectedTweets = 0;
  // 検索の進捗状態
  public status: string;

  constructor(
    private dialogRef: MatDialogRef<TrainerDialogComponent>,
    private topicsService: TopicsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  /**
   * 初期化
   */
  async ngOnInit() {
    // コンポーネントから渡された値を取得
    this.crawlSocialAccountId = +this.data.crawlSocialAccountId;
    this.keywords = this.data.keywords;
    this.tweets = this.data.tweets || null;
    // 値を初期化
    this.status = 'しばらくお待ちください...';
    this.numOfSelectedTweets = 0;
    // ツイートの初期化
    if (this.tweets === null) {
      // 教師データ生成用のサンプルツイートを収集
      this.getSampleTweets();
    } else {
      // コンポーネントから渡されたお手本分類の結果から復元
      for (const tweet of this.tweets) {
        if (tweet.selected) {
          this.numOfSelectedTweets++;
        }
      }
    }
  }

  /**
   * 教師データ生成用のサンプルツイートの収集
   */
  async getSampleTweets() {
    let tweets = [];
    for (const keyword of this.keywords) {
      this.status = `ツイートを検索しています... ${keyword}`;
      let keyword_tweets = await this.topicsService.getSampleTweets(this.crawlSocialAccountId, keyword);
      tweets = tweets.concat(keyword_tweets);
    }
    // リツイート数でソート
    tweets = tweets.sort((a: any, b: any) => {
      return b.crawledRetweetCount - a.crawledRetweetCount;
    });
    this.tweets = tweets;
  }

  /**
   * ツイートの選択状態が変更されたときに呼び出されるリスナ
   * @param tweetIdStr ツイートのID文字列
   * @param isSelected 選択状態
   */
  onTweetSelectChanged(tweetIdStr: any, isSelected: boolean) {
    if (isSelected) {
      this.numOfSelectedTweets += 1;
    } else {
      this.numOfSelectedTweets -= 1;
    }

    this.tweets.find((tweet: any) => {
      if (tweet.idStr === tweetIdStr) {
        tweet.selected = isSelected;
        console.log(tweetIdStr, tweet);
      }
    });
  }

  /**
   * 完了
   */
  finish() {
    if (this.numOfSelectedTweets <= 0) {
      return;
    }

    this.dialogRef.close({
      tweets: this.tweets,
    });
  }

  /**
   * キャンセル
   */
  cancel() {
    this.dialogRef.close();
  }
}
