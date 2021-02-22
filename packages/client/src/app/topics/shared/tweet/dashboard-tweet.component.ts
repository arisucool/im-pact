import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TweetComponent } from './tweet.component';
import { TweetFilterTraining, TweetFilter, TweetFilterResult } from '../tweet-filter.interface';
import { TweetReclassificationEvent } from '../tweet-reclassification-event.interface';

@Component({
  selector: 'app-dashboard-tweet',
  templateUrl: './dashboard-tweet.component.html',
  styleUrls: ['./tweet.component.scss', './dashboard-tweet.component.scss'],
})
export class DashboardTweetComponent extends TweetComponent implements OnInit {
  @Input() tweet: any;
  @Input() actions: any[];
  @Input() filters: {
    id: string;
    filterName: string;
    description: string;
    settings: { [key: string]: any };
    features: {
      train: boolean;
      batch: boolean;
    };
  }[];
  @Input() availableFilters: any;
  @Output() tweetReclassificationRequest = new EventEmitter<TweetReclassificationEvent>();

  // ツイートが選択されたか
  isSelected = null;

  // ツイートのデータ
  rawData: any;

  // ツイートフィルタの実行結果 (デバッグ用)
  filtersResult: string[];

  // ツイートメニューを表示しているか否か
  isShowingTweetMenu = false;

  // ツイートメニューの選択肢
  destinationActions: string[] = null;

  // ツイートフィルタのトレーニング情報
  // (承認→拒否 または 拒否→承認にする場合は、ツイートフィルタの再トレーニングも併せて行うため、トレーニング可能なフィルタの情報を代入しておく)
  filterTrainings: TweetFilterTraining[] = [];
  currentFilterTraining: TweetFilterTraining = null;
  currentFilterTrainingIndex = -1;

  // 親コンポーネントへ送信するための情報
  protected emitData: TweetReclassificationEvent = {
    tweetIdStr: null,
    destinationActionIndex: null,
    classifierRetrainingRequest: {
      selected: null,
    },
    filterRetrainingRequests: [],
  };

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.isSelected = this.tweet.predictedClass === 'accept' ? true : false;
    this.rawData = JSON.parse(this.tweet.rawJSONData);

    // 当該ツイートがどのアクションまで実行されたかを取得
    const completeActionIndex = this.tweet.completeActionIndex;

    // 当該ツイートの遷移可能なアクションを列挙
    this.destinationActions = JSON.parse(JSON.stringify(this.actions)).map((action: any, index: number) => {
      action.index = index;
      return action;
    });
    if (this.isSelected) {
      // 承認済みツイートならば、現在所属しているアクションを除く
      this.destinationActions = this.destinationActions.filter(
        (action: any, index: number) => completeActionIndex + 1 !== index,
      );
    }

    // 当該ツイートに対するツイートフィルタの実行結果からトレーニング情報を生成
    this.filterTrainings = this.getFilterTrainings(this.availableFilters, this.tweet.filtersResult);
  }

  /**
   * ツイートフィルタのトレーニング情報の取得
   * @param availableFilters ツイートフィルタの配列
   * @param filtersResult ツイートフィルタの実行結果
   */
  getFilterTrainings(availableFilters: TweetFilter[], filtersResult: TweetFilterResult[]): TweetFilterTraining[] {
    const filterTrainings: TweetFilterTraining[] = [];

    // ツイートフィルタの実行結果を反復
    for (const filterResult of filtersResult) {
      // 当該ツイートフィルタを取得
      const filter: TweetFilter = availableFilters[filterResult.filterName];
      if (!filter) {
        continue;
      }

      // 当該ツイートフィルタが学習に対応をしているか確認
      if (!filter.features.train) {
        // 学習に非対応ならばスキップ
        continue;
      }

      // 配列へ追加
      filterTrainings.push({
        filter: filter,
        filterName: filterResult.filterName,
        filterResult: filterResult,
      });
    }

    return filterTrainings;
  }

  /**
   * ツイートの承認ボタンがクリックされたときに呼び出されるリスナ
   * @param destinationActionIndex 当該ツイートをどのアクションへ遷移させるか
   */
  onTweetAccepted(destinationActionIndex: number): void {
    // ディープラーニング分類器を再トレーニングするための情報を設定
    this.emitData.classifierRetrainingRequest.selected = true;

    // ツイートの遷移先アクションを設定
    this.emitData.destinationActionIndex = destinationActionIndex;

    // ツイートフィルタの再トレーニングが可能かどうかを確認
    if (this.isAvailableNextTweetFilterRetraining()) {
      // 再トレーニングを表示
      this.showNextTweetFilterRetraining();
      return;
    }

    // 再トレーニング可能なツイートフィルタがなければ、ただちに親コンポーネントへ選択結果を送信
    this.emitResultToParentComponent();
  }

  /**
   * ツイートの拒否ボタンがクリックされたときに呼び出されるリスナ
   */
  onTweetRejected(): void {
    // ディープラーニング分類器を再トレーニングするための情報を設定
    this.emitData.classifierRetrainingRequest.selected = false;

    // ツイートフィルタの再トレーニングが可能かどうかを確認
    if (this.isAvailableNextTweetFilterRetraining()) {
      // 再トレーニングを表示
      this.showNextTweetFilterRetraining();
      return;
    }

    // 再トレーニング可能なツイートフィルタがなければ、ただちに親コンポーネントへ選択結果を送信
    this.emitResultToParentComponent();
  }

  /**
   * ツイートフィルタの再トレーニングが可能か否かの取得
   * @return 再トレーニング可能なツイートフィルタが存在するならば true
   */
  isAvailableNextTweetFilterRetraining(): boolean {
    return this.currentFilterTrainingIndex < this.filterTrainings.length - 1;
  }

  /**
   * 次のツイートフィルタの再トレーニング領域の表示
   */
  showNextTweetFilterRetraining(): void {
    this.currentFilterTrainingIndex++;
    this.currentFilterTraining = this.filterTrainings[this.currentFilterTrainingIndex];
  }

  /**
   * ツイートフィルタの再トレーニングのための正解ボタン・不正解ボタンがクリックされたときに呼び出されるリスナ
   * @param isCorrect ツイートフィルタの判断が正しかったか否か
   */
  onTweetFilterRetrainingAnswered(isCorrect: boolean): void {
    // ユーザによって入力された情報を保持
    this.emitData.filterRetrainingRequests.push({
      filterId: this.filterTrainings[this.currentFilterTrainingIndex].filterResult.filterId,
      isCorrect: isCorrect,
      previousSummaryValue: this.filterTrainings[this.currentFilterTrainingIndex].filterResult.result.summary
        .summaryValue,
    });

    // 次のツイートフィルタが存在するかを確認
    if (this.isAvailableNextTweetFilterRetraining()) {
      // 次のツイートフィルタの再トレーニング領域を表示
      this.showNextTweetFilterRetraining();
      return;
    }

    // 完了
    this.currentFilterTraining = null;
    this.currentFilterTrainingIndex = -1;

    // 親コンポーネントへ選択結果を送信
    this.emitResultToParentComponent();
  }

  /**
   * ツイートフィルタの再トレーニングのキャンセルボタンがクリックされたときに呼び出されるリスナ
   */
  onTweetFilterRetrainingCanceled(): void {
    this.currentFilterTraining = null;
    this.currentFilterTrainingIndex = -1;
    this.emitData.filterRetrainingRequests = [];
  }

  /**
   * ユーザによる選択結果 (ディープラーニングを再トレーニングするための情報) および ツイートフィルタを再トレーニングするための情報の送信
   */
  emitResultToParentComponent(): void {
    // 親コンポーネントへイベントを送信
    this.emitData.tweetIdStr = this.tweet.idStr;
    this.tweetReclassificationRequest.emit(this.emitData);
  }

  convertFilterResultValueToString(value: any): string {
    if (Number.isInteger(value)) {
      return String(value);
    } else {
      return parseFloat(value).toFixed(2);
    }
  }
}
