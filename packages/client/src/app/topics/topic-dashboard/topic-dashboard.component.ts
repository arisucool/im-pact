import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TopicsService } from '../topics.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TweetReclassificationEvent } from '../shared/tweet-reclassification-event.interface';
import { TweetFilterRetrainingRequest } from 'src/.api-client/models/tweet-filter-retraining-request';

@Component({
  selector: 'app-topic-dashboard',
  templateUrl: './topic-dashboard.component.html',
  styleUrls: ['./topic-dashboard.component.scss'],
})
export class TopicDashboardComponent implements OnInit {
  // 読み込み中フラグ
  isInitialLoading = true;
  isLoadingRejectedTweets = true;
  isLoadingAcceptedTweetsByActions = {};

  // トピック
  topic = {
    // トピックID
    id: null,
    // トピック名
    name: null,
    // 収集アカウント
    crawlSocialAccount: {
      id: null,
      serviceName: null,
      displayName: null,
    },
    // 収集スケジュール
    crawlSchedule: null,
    // キーワード
    keywords: [],
    // ツイートフィルタ
    filterPatterns: [
      {
        name: 'パターン 1',
        score: null,
        trainedModelId: null,
        filters: [],
      },
    ],
    enabledFilterPatternIndex: 0,
    // アクション
    actions: [],
    // お手本分類の結果
    trainingTweets: [],
  };

  // 承認ツイート
  acceptedTweets = null;

  // アクション毎に整理した承認ツイート
  // (但し、0番目以降が各アクション未完了の承認ツイート、一番最後がアクション全完了の承認ツイート)
  actionIndexOfAllActionCompleted = 0;
  acceptedTweetsByActions = [];

  // 拒否ツイート
  rejectedTweets = null;

  // 利用可能なツイートフィルタ
  availableFilters = {};

  // ドロワが展開されているか否か
  isOpenedDrawer = true;

  // FAB メニューが展開されているか否か
  isOpenedFABMenu = false;

  // ツイートグリッドのレイアウトを更新するための数値
  // (この数値を変更すると、ngx-masonry による再レイアウト処理が実行される)
  updateLayout: number = null;

  // ツイートグリッドのレイアウトを更新するまでしばらく待つためのタイマー
  updateTimer: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private topicsService: TopicsService,
  ) {}

  /**
   * コンポーネントが初期化されたときに呼び出されるリスナ
   */
  async ngOnInit() {
    // URL からトピックIDを取得
    const topicId = +this.route.snapshot.paramMap.get('id');
    if (!topicId) {
      // 新規作成ならば、何もしない
      return;
    }

    // トピックの読み込み
    await this.loadTopic(topicId);

    // 使用可能なツイートフィルタの読み込み
    this.availableFilters = await this.topicsService.getAvailableTweetFilters();

    // 承認ツイートの読み込み (アクション別)
    for (const [actionIndex] of this.topic.actions.entries()) {
      this.isLoadingAcceptedTweetsByActions[actionIndex] = true;
      await this.loadAcceptedTweets(actionIndex, null);
    }

    // 承認ツイートの読み込み (全アクション完了のツイート)
    this.actionIndexOfAllActionCompleted = this.topic.actions.length;
    await this.loadAcceptedTweets(this.actionIndexOfAllActionCompleted, null);

    // 拒否ツイートの読み込み
    await this.loadRejectedTweets();

    // 読み込み完了
    this.isInitialLoading = false;
    this.isOpenedDrawer = false;
    for (const [actionIndex] of this.topic.actions.entries()) {
      this.isLoadingAcceptedTweetsByActions[actionIndex] = false;
    }
  }

  /**
   * 指定されたトピックの読み込み
   * @param topicId トピックID
   */
  async loadTopic(topicId: number) {
    try {
      // 初期化
      this.acceptedTweets = [];
      this.acceptedTweetsByActions = [];
      this.rejectedTweets = [];

      // トピックを読み込み
      this.topic = (await this.topicsService.getTopic(topicId)) as any;
      if (this.topic.actions.length === 0) {
        this.snackBar
          .open('アクションが一つもありません。アクションを追加してください。', '設定を開く', {
            duration: 5000,
          })
          .onAction()
          .subscribe(() => {
            // "アクションを追加" ボタン が押されたときは、設定画面へ遷移
            this.router.navigate(['topics', this.topic.id, 'edit']);
          });
      }
    } catch (e) {
      if (e.error?.message.join) {
        this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
      } else if (e.error?.message) {
        this.snackBar.open(`エラー: ${e.error?.message}`, null, { duration: 5000 });
      } else {
        this.snackBar.open(`エラー: ${e.toString()}`, null, { duration: 5000 });
      }
    }
  }

  /**
   * 承認ツイートの読み込み
   * @param pendngActionIndex アクションの番号 (承認ツイートはアクションに基づいて取得・表示するため)
   * @param lastClassifiedAt 分類日時 (ページング用。この値よりも収集日時の古い項目が取得される。)
   */
  async loadAcceptedTweets(pendngActionIndex: number, lastClassifiedAt?: Date) {
    this.isLoadingAcceptedTweetsByActions[pendngActionIndex] = true;

    try {
      // 分類済みツイートを読み込み
      let acceptedTweets = await this.topicsService.getClassifiedTweets(
        this.topic.id,
        'accept',
        pendngActionIndex,
        lastClassifiedAt,
      );

      // 既存のツイートとの重複を除去
      if (this.acceptedTweetsByActions && this.acceptedTweetsByActions[pendngActionIndex]) {
        acceptedTweets = this.acceptedTweetsByActions[pendngActionIndex].concat(acceptedTweets);
      }
      acceptedTweets = acceptedTweets.filter(
        (item, i, self) => self.findIndex(item_ => item.idStr === item_.idStr) === i,
      );

      // 書き換え
      this.acceptedTweetsByActions[pendngActionIndex] = acceptedTweets;
    } catch (e) {
      if (e.error?.message.join) {
        this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
      } else if (e.error?.message) {
        this.snackBar.open(`エラー: ${e.error?.message}`, null, { duration: 5000 });
      } else {
        this.snackBar.open(`エラー: ${e.toString()}`, null, { duration: 5000 });
      }
      return;
    }

    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;

      // ツイートグリッドのレイアウトを更新 (ngx-masonry で再レイアウトされる)
      this.updateLayout = new Date().getTime();

      // 完了
      this.isLoadingAcceptedTweetsByActions[pendngActionIndex] = false;
    }, 500);
  }

  /**
   * 拒否ツイートの読み込み
   * @param lastClassifiedAt 分類日時 (ページング用。この値よりも収集日時の古い項目が取得される。)
   */
  async loadRejectedTweets(lastClassifiedAt?: Date) {
    this.isLoadingRejectedTweets = true;

    try {
      // 分類済みツイートを読み込み
      let rejectedTweets = await this.topicsService.getClassifiedTweets(
        this.topic.id,
        'reject',
        null,
        lastClassifiedAt,
      );

      // 既存のツイートとの重複を除去
      if (this.rejectedTweets) {
        rejectedTweets = this.rejectedTweets.concat(rejectedTweets);
      }
      rejectedTweets = rejectedTweets.filter(
        (item, i, self) => self.findIndex(item_ => item.idStr === item_.idStr) === i,
      );

      // 書き換え
      this.rejectedTweets = rejectedTweets;
    } catch (e) {
      if (e.error?.message.join) {
        this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
      } else if (e.error?.message) {
        this.snackBar.open(`エラー: ${e.error?.message}`, null, { duration: 5000 });
      } else {
        this.snackBar.open(`エラー: ${e.toString()}`, null, { duration: 5000 });
      }
      return;
    }

    this.updateTimer = window.setTimeout(() => {
      this.updateTimer = null;

      // ツイートグリッドのレイアウトを更新 (ngx-masonry で再レイアウトされる)
      this.updateLayout = new Date().getTime();

      // 完了
      this.isLoadingRejectedTweets = false;
    }, 500);
  }

  /**
   * ツイートの再分類が要求されたときに呼び出されるリスナ
   * @param tweetIdStr ツイートのID文字列
   * @param event イベントのデータ
   */
  async onTweetReclassificationRequested(tweetIdStr: string, event: TweetReclassificationEvent): Promise<void> {
    if (event.classifierRetrainingRequest.selected) {
      // ユーザによって承認されたならば
      await this.moveTweetToAccepted(
        tweetIdStr,
        event.filterRetrainingRequests,
        // 遷移先のアクション番号が -1 ならばアーカイブへ移動する
        event.destinationActionIndex === -1 ? this.actionIndexOfAllActionCompleted : event.destinationActionIndex,
      );
    } else {
      // ユーザによって拒否されたならば
      await this.moveTweetToRejected(tweetIdStr, event.filterRetrainingRequests);
    }

    // ツイートグリッドを更新
    this.updateTimer = new Date().getTime();
  }

  /**
   * 指定されたツイートを承認へ移動
   * (あるアクションに所属する承認ツイートを別のアクションへ移動することも可能)
   * @param tweetIdStr ツイートのID文字列
   * @param tweetFilterRetrainingRequests ツイートフィルタを再トレーニングするための情報
   * @param actionIndex アクション番号 (指定されたアクション番号の待ち行列へ入る) (-1 ならばアーカイブ)
   */
  async moveTweetToAccepted(
    tweetIdStr: string,
    tweetFilterRetrainingRequests: TweetFilterRetrainingRequest[],
    actionIndex: number = null,
  ) {
    // 当該ツイートを取得
    let tweet = null;
    let tweetIndex = this.rejectedTweets.findIndex((item: any) => item.idStr === tweetIdStr);
    if (0 <= tweetIndex) {
      tweet = this.rejectedTweets[tweetIndex];
      // 拒否ツイートの配列から当該ツイート削除
      this.rejectedTweets.splice(tweetIndex, 1);
    } else {
      // アクションを反復
      for (const [actionIndexOld] of this.topic.actions.entries()) {
        tweetIndex = this.acceptedTweetsByActions[actionIndexOld].findIndex((item: any) => item.idStr === tweetIdStr);
        if (0 <= tweetIndex) {
          tweet = this.acceptedTweetsByActions[actionIndexOld][tweetIndex];
          // 当該アクションに属する承認ツイートの配列から当該ツイートを削除
          this.acceptedTweetsByActions[actionIndexOld].splice(tweetIndex, 1);
          break;
        }
      }
    }

    if (tweet === null) return;

    // 当該ツイートを承認ツイートとして先頭へ追加
    // (末尾へ追加するとページングの不具合となるため)
    tweet.predictedClass = 'accept';
    if (actionIndex === null) {
      this.acceptedTweetsByActions[0].unshift(tweet);
    } else {
      this.acceptedTweetsByActions[actionIndex].unshift(tweet);
    }

    // データベース上でも承認へ変更して、ディープラーニング分類器およびツイートフィルタを再トレーニング
    this.snackBar.open('当該ツイートを承認にして再学習します...', null, { duration: 1500 });
    await this.topicsService.acceptTweet(this.topic.id, tweet, tweetFilterRetrainingRequests, actionIndex - 1);
  }

  /**
   * 指定されたツイートを拒否へ移動
   * @param tweetIdStr ツイートのID文字列
   * @param tweetFilterRetrainingRequests ツイートフィルタを再トレーニングするための情報
   */
  async moveTweetToRejected(tweetIdStr: string, tweetFilterRetrainingRequests: TweetFilterRetrainingRequest[]) {
    // アクションを反復
    let tweet = null;
    for (const [actionIndex] of this.topic.actions.entries()) {
      const tweetIndex = this.acceptedTweetsByActions[actionIndex].findIndex((item: any) => item.idStr === tweetIdStr);
      if (0 <= tweetIndex) {
        tweet = this.acceptedTweetsByActions[actionIndex][tweetIndex];
        // 当該アクションに属する承認ツイートの配列から当該ツイートを削除
        this.acceptedTweetsByActions[actionIndex].splice(tweetIndex, 1);
        break;
      }
    }

    if (tweet === null) return;

    // 当該ツイートを拒否ツイートとして先頭へ追加
    // (末尾へ追加するとページングの不具合となるため)
    tweet.predictedClass = 'reject';
    this.rejectedTweets.unshift(tweet);

    // データベース上でも拒否へ変更して、ディープラーニング分類器およびツイートフィルタを再トレーニング
    this.snackBar.open('当該ツイートを拒否にして再学習します...', null, { duration: 1500 });
    await this.topicsService.rejectTweet(this.topic.id, tweet, tweetFilterRetrainingRequests);
  }

  /**
   * 承認ツイートグリッドの次ページ読み込み
   * @param actionIndex アクション番号
   */
  async loadMoreAcceptedTweets(actionIndex: number) {
    if (this.acceptedTweetsByActions[actionIndex].length <= 0) return;

    // 最後の承認ツイートの収集日時を取得
    const lastTweet = this.acceptedTweetsByActions[actionIndex][this.acceptedTweetsByActions[actionIndex].length - 1];

    // ツイートを追加で読み込み
    await this.loadAcceptedTweets(actionIndex, new Date(lastTweet.classifiedAt));
  }

  /**
   * 拒否ツイートグリッドの次ページ読み込み
   */
  async loadMoreRejectedTweets() {
    if (this.rejectedTweets.length <= 0) return;

    // 最後の承認ツイートの収集日時を取得
    const lastTweet = this.rejectedTweets[this.rejectedTweets.length - 1];

    // ツイートを追加で読み込み
    await this.loadRejectedTweets(new Date(lastTweet.classifiedAt));
  }

  /**
   * トピックの収集実行
   * (サーバ上のキューへ追加される)
   */
  async execCrawl() {
    await this.topicsService.execCrawl(this.topic.id);
    this.snackBar.open('収集の実行をリクエストしました。しばらくお待ちください...', null, { duration: 1500 });
  }

  /**
   * トピックの分類実行
   * (サーバ上のキューへ追加される)
   */
  async execClassification() {
    await this.topicsService.execClassification(this.topic.id);
    this.snackBar.open('分類の実行をリクエストしました。しばらくお待ちください...', null, { duration: 1500 });
  }

  /**
   * トピックのアクション実行
   * (サーバ上のキューへ追加される)
   */
  async execActions() {
    await this.topicsService.execActions(this.topic.id);
    this.snackBar.open('アクションの実行をリクエストしました。しばらくお待ちください...', null, { duration: 1500 });
  }

  /**
   * 指定されたアクション番号に応じた色の取得
   * @param actionIndex アクション番号
   */
  getActionColor(actionIndex: number) {
    if (actionIndex === this.actionIndexOfAllActionCompleted) {
      // アーカイブならば、グレー
      return '#777777';
    }

    const COLOR_PALLETS = [
      // 赤
      '#e74c3c',
      // オレンジ
      '#e67e22',
      // 黄
      '#f1c40f',
      // 緑
      '#2ecc71',
      // 青
      '#3498db',
      // 藍
      '#2980b9',
      // 紫
      '#9b59b6',
    ];

    if (COLOR_PALLETS.length <= actionIndex) {
      return '#777777';
    }

    return COLOR_PALLETS[actionIndex];
  }
}
