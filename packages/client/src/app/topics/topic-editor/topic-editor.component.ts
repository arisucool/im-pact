import { Component, OnInit } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ModuleChooserSheetComponent } from './module-chooser-sheet/module-chooser-sheet.component';
import { TopicsService } from '../topics.service';
import { MatDialog } from '@angular/material/dialog';
import { TrainerDialogComponent } from './trainer-dialog/trainer-dialog.component';
import { TrainingDialogComponent } from './training-dialog/training-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * トピック作成・編集画面のコンポーネント
 */
@Component({
  selector: 'app-topic-editor',
  templateUrl: './topic-editor.component.html',
  styleUrls: ['./topic-editor.component.scss'],
})
export class TopicEditorComponent implements OnInit {
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
    filters: [],
    // アクション
    actions: [],
    // お手本分類の結果
    trainingTweets: [],
  };
  // 使用可能なソーシャルアカウント
  availableSocialAccounts: any[];
  // ツイートフィルタの設定用テンプレート
  availableTweetFilters = {};
  // アクションの設定用テンプレート
  availableActions = {};

  // 収集スケジュールのプレースホルダ (例文)
  topicSchedulePlaceholder = `# 【書式】　　分　　時　　日　　月　　曜日

# 【例】 毎日の毎時0分・30分に実行する場合
0,30  *  *  *  *

# 【例】 7月31日の毎時0分・15分・30分・45分に実行する場合
0,15,30,45  *  31  7  *`;

  constructor(
    private topicsService: TopicsService,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  async ngOnInit() {
    // 利用可能なソーシャルアカウントを読み込み
    this.availableSocialAccounts = await this.topicsService.getAvailableSocialAccounts();

    // 利用可能なツイートフィルタを読み込み
    this.availableTweetFilters = await this.topicsService.getAvailableTweetFilters();

    // 利用可能なアクションを読み込み
    this.availableActions = await this.topicsService.getAvailableActions();

    // URL からトピックIDを取得
    const topicId = +this.route.snapshot.paramMap.get('id');
    if (!topicId) {
      // 新規作成ならば、何もしない
      return;
    }

    // トピックの読み込み
    await this.loadTopic(topicId);
  }

  /**
   * トピックの読み込み
   */
  async loadTopic(topicId: number) {
    try {
      this.topic = (await this.topicsService.getTopic(topicId)) as any;
      this.snackBar.open('トピックを読み込みました', null, { duration: 1000 });
    } catch (e) {
      this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
    }
  }

  /**
   * トピックの保存
   */
  async save() {
    console.log(this.topic);
    try {
      let savedTopic: any = await this.topicsService.saveTopic(this.topic);

      this.snackBar.open('トピックを保存しました', null, { duration: 1000 });

      // 編集画面へ
      this.router.navigate(['/topics/edit/', savedTopic.id]);
    } catch (e) {
      this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
    }
  }

  /**
   * キーワードの追加
   */
  addKeyword(): void {
    if (1 <= this.topic.keywords.length && this.topic.keywords[this.topic.keywords.length - 1].length === 0) {
      // 既に空のキーワードがあれば何もしない
      return;
    }
    this.topic.keywords.push('');
  }

  /**
   * 指定されたキーワードの削除
   * @param delete_keyword キーワード
   */
  deleteKeyword(delete_keyword: string): void {
    this.topic.keywords = this.topic.keywords.filter(keyword => {
      return keyword !== delete_keyword;
    });
  }

  /**
   * 教師データ作成ダイアログの表示
   */
  async openTrainerDialog() {
    const dialogRef = this.dialog.open(TrainerDialogComponent, {
      data: {
        crawlSocialAccountId: this.topic.crawlSocialAccount.id,
        keywords: this.topic.keywords,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      // 手動分類の結果を取得
      this.topic.trainingTweets = result.tweets;
    });
  }

  /**
   * トレーニング＆検証ダイアログの表示
   */
  async openTrainingDialog() {
    const dialogRef = this.dialog.open(TrainingDialogComponent, {
      data: {
        keywords: this.topic.keywords,
        filters: this.topic.filters,
        trainingTweets: this.topic.trainingTweets,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      // TODO
      console.log(result);
    });
  }

  /**
   * ツイートフィルタの追加
   */
  addTweetFilter(): void {
    this.bottomSheet
      .open(ModuleChooserSheetComponent, {
        data: {
          moduleType: 'TWEET_FILTER',
        },
      })
      .afterDismissed()
      .subscribe(choosedFilterName => {
        if (!choosedFilterName) return;
        // トピックへツイートフィルタを追加
        this.topic.filters.push({
          name: choosedFilterName,
          settings: {},
        });
      });
  }

  /**
   * アクションの追加
   */
  addAction(): void {
    this.bottomSheet
      .open(ModuleChooserSheetComponent, {
        data: {
          moduleType: 'ACTION',
        },
      })
      .afterDismissed()
      .subscribe(choosedActionName => {
        if (!choosedActionName) return;
        // トピックへ追加
        this.topic.actions.push({
          name: choosedActionName,
          settings: {},
        });
      });
  }

  /**
   * 指定されたツイートフィルタの削除
   * @param filter_index ツイートフィルタのインデックス番号
   */
  deleteTweetFilter(filter_index: number) {
    this.topic.filters.splice(filter_index, 1);
  }

  /**
   * 指定されたアクションの削除
   * @param action_index アクションのインデックス番号
   */
  deleteAction(action_index: number) {
    this.topic.actions.splice(action_index, 1);
  }

  /**
   * 配列のアイテムを ngModel で入力欄へ双方向バインディングしたとき、入力毎にフォーカスが外れる問題の対策
   * @param index
   * @param obj
   */
  myTrackBy(index: number, obj: any): any {
    return index;
  }
}
