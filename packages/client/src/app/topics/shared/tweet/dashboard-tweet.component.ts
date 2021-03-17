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
  isArchived = false;

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
      // 承認済みツイートならば、アーカイブされているか否かを代入
      this.isArchived = completeActionIndex === this.destinationActions.length - 1;
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
   * @param destinationActionIndex 当該ツイートをどのアクションへ遷移させるか (-1 ならばアーカイブ)
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
   * ツイートフィルタの再トレーニングのための選択肢ボタンがクリックされたときに呼び出されるリスナ
   * @param choiceKey 選択肢のキー
   */
  onTweetFilterRetrainingAnswered(choiceKey: string): void {
    // ユーザによって入力された情報を保持
    this.emitData.filterRetrainingRequests.push({
      filterId: this.filterTrainings[this.currentFilterTrainingIndex].filterResult.filterId,
      previousChoiceKey: this.filterTrainings[this.currentFilterTrainingIndex].filterResult.result.summary
        .resultChoiceKey,
      correctChoiceKey: choiceKey,
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

  /**
   * 指定されたツイートフィルタの実行結果からの文字列の取得
   * @param value ツイートフィルタの実行結果
   * @return 整形された文字列 (例: "0.10" or "1")
   */
  convertFilterResultValueToString(value: number[] | number): string {
    if (value instanceof Array) {
      // One Hot Coding された値 (カテゴリカル変数) ならば、文字列 (例: "0") にして返す
      const index = value.findIndex((val: number) => val === 1);
      if (index === -1) return '-';
      return String(index);
    }

    if (Number.isInteger(value)) {
      // 整数ならば、そのまま文字列 (例: "100") にして返す
      return String(value);
    }

    // 小数ならば、小数点以下2桁の文字列 (例: "0.10") にして返す
    return value.toFixed(2);
  }
}
