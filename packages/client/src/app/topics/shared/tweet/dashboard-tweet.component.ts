import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TweetComponent } from './tweet.component';

@Component({
  selector: 'app-dashboard-tweet',
  templateUrl: './dashboard-tweet.component.html',
  styleUrls: ['./tweet.component.scss', './dashboard-tweet.component.scss'],
})
export class DashboardTweetComponent extends TweetComponent implements OnInit {
  @Input() tweet: any;
  @Input() actions: any[];
  @Output() itemButtonClickedEvent = new EventEmitter<{
    tweetIdStr: string;
    selected: boolean;
    actionIndex?: number;
  }>();
  isSelected = null;

  // ツイートのデータ
  rawData: any;

  // ツイートフィルタの実行結果 (デバッグ用)
  filtersResult: string[];

  // アイテムメニューを表示しているか否か
  isShowingItemMenu = false;

  // アイテムメニューの選択肢
  detinationActions: string[];

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.isSelected = this.tweet.predictedClass === 'accept' ? true : false;
    this.rawData = JSON.parse(this.tweet.rawJSONData);
    this.filtersResult = this.tweet.filtersResult.map(result => {
      if (Number.isInteger(result) || !result.match(/\./)) {
        return String(result);
      } else {
        return parseFloat(result).toFixed(1);
      }
    });

    // 当該ツイートがどのアクションまで実行されたかを取得
    const completeActionIndex = this.tweet.completeActionIndex;

    // 当該ツイートの遷移可能なアクションを列挙
    this.detinationActions = JSON.parse(JSON.stringify(this.actions)).map((action: any, index: number) => {
      action.index = index;
      return action;
    });
    if (this.isSelected) {
      // 承認済みツイートならば、現在所属しているアクションを除く
      this.detinationActions = this.detinationActions.filter((action: any, index: number) => completeActionIndex + 1 !== index);
    }
  }

  /**
   * 承認ボタンがクリックされたときに呼び出されるリスナ
   */
  onItemAccepted(actionIndex: number) {
    // 親コンポーネントへイベントを送信
    this.itemButtonClickedEvent.emit({
      tweetIdStr: this.tweet.idStr,
      selected: true,
      actionIndex: actionIndex,
    });
  }

  /**
   * 拒否ボタンがクリックされたときに呼び出されるリスナ
   */
  onItemRejected() {
    // 親コンポーネントへイベントを送信
    this.itemButtonClickedEvent.emit({
      tweetIdStr: this.tweet.idStr,
      selected: false,
    });
  }
}
