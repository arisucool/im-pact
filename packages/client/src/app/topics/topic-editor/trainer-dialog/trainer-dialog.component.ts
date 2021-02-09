import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TopicsService } from '../../topics.service';
import { DialogService } from 'src/app/shared/dialog.service';

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
  // 少なくとも幾つのツイートを選択すべきか
  public static RECOMMENDED_MIN_NUM_OF_SELECTED_TWEETS = 50;
  // Twitter の検索条件
  public crawlSocialAccountId: number;
  public keywords: string[];
  // Twitter の検索結果
  public isLoading = false;
  public tweets: any[];
  public numOfSelectedTweets = 0;
  // 検索の進捗状態
  public status: string;

  constructor(
    private dialogRef: MatDialogRef<TrainerDialogComponent>,
    private topicsService: TopicsService,
    private dialogService: DialogService,
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
    if (this.tweets === null || this.tweets.length === 0) {
      // 教師データ生成用のサンプルツイートを収集
      await this.getSampleTweets();
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
   * 教師データ生成用のサンプルツイートの取得
   */
  async getSampleTweets() {
    this.isLoading = true;
    let tweets = [];
    for (const keyword of this.keywords) {
      this.status = `ツイートを検索しています... ${keyword}`;
      const keywordTweets = await this.topicsService.getSampleTweets(this.crawlSocialAccountId, keyword);
      tweets = tweets.concat(keywordTweets);
    }
    this.status = `お待ちください...`;
    // リツイート数でソート
    tweets = tweets.sort((a: any, b: any) => b.crawledRetweetCount - a.crawledRetweetCount);
    // 完了
    this.tweets = tweets;
    this.isLoading = false;
  }

  /**
   * 教師データ生成用のサンプルツイートの追加取得
   */
  async getMoreSampleTweets() {
    this.isLoading = true;
    let tweets = this.tweets;
    for (const keyword of this.keywords) {
      this.status = `ツイートを追加検索しています... ${keyword}`;
      const keywordTweets = await this.topicsService.getSampleTweets(this.crawlSocialAccountId, keyword);
      tweets = tweets.concat(keywordTweets);
    }
    this.status = `お待ちください...`;
    // 重複を除去
    tweets = tweets.filter((item, i, self) => self.findIndex(item_ => item.idStr === item_.idStr) === i);
    // リツイート数でソート
    tweets = tweets.sort((a: any, b: any) => b.crawledRetweetCount - a.crawledRetweetCount);
    // 完了
    this.tweets = tweets;
    this.isLoading = false;
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
  async finish() {
    // 選択状況を確認
    if (this.numOfSelectedTweets <= 0) {
      return;
    } else if (this.numOfSelectedTweets <= TrainerDialogComponent.RECOMMENDED_MIN_NUM_OF_SELECTED_TWEETS) {
      // 選択が不十分ならば、追加取得を勧める
      const result = await this.dialogService.openConfirm(
        'お手本分類',
        `現在、${this.numOfSelectedTweets} 件しか選択されていません。
精度を確保するためには、最低でも ${TrainerDialogComponent.RECOMMENDED_MIN_NUM_OF_SELECTED_TWEETS} 件は選択することをおすすめします。\n\nさらに多くのツイートを取得しますか？`,
      );
      if (result) {
        // ツイートの追加取得
        this.getMoreSampleTweets();
        return;
      }
    }

    this.dialogRef.close({
      tweets: this.tweets,
    });
  }

  /**
   * キャンセル
   */
  async cancel() {
    const result = await this.dialogService.openConfirm(
      'お手本分類のキャンセル',
      '選択状況が元に戻ります。よろしいですか？',
    );
    if (!result) return;

    this.dialogRef.close();
  }
}
