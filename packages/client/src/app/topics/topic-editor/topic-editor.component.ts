import { Component, OnInit, ViewChild } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ModuleChooserSheetComponent } from './module-chooser-sheet/module-chooser-sheet.component';
import { TopicsService } from '../topics.service';
import { MatDialog } from '@angular/material/dialog';
import { TrainerDialogComponent } from './trainer-dialog/trainer-dialog.component';
import { TrainingAndValidationDialogComponent } from './training-and-validation-dialog/training-and-validation-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabGroup } from '@angular/material/tabs';

/**
 * トピック作成・編集画面のコンポーネント
 */
@Component({
  selector: 'app-topic-editor',
  templateUrl: './topic-editor.component.html',
  styleUrls: ['./topic-editor.component.scss'],
})
export class TopicEditorComponent implements OnInit {
  // ツイートフィルタのパターンのタブを制御するための変数
  @ViewChild(MatTabGroup) tabGroup: MatTabGroup;
  currentShowingFilterPatternTabIndex = 0;

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
    // 検索条件
    searchCondition: {
      keywords: [],
      language: null,
      to: null,
      minFaves: 0,
      minRetweets: 0,
      minReplies: 0,
      images: false,
    },
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
      // トピックを読み込み
      this.topic = (await this.topicsService.getTopic(topicId)) as any;

      // ツイートフィルタパターンのタブを切り替え
      this.tabGroup.selectedIndex = this.topic.enabledFilterPatternIndex;

      // メッセージを表示
      this.snackBar.open('トピックを読み込みました', null, { duration: 1000 });
    } catch (e) {
      if (e.error?.message.join) {
        this.snackBar.open(`エラー: ${e.error?.message?.join(' / ')}`, null, { duration: 5000 });
      } else {
        this.snackBar.open(`エラー: ${e.error?.message}`, null, { duration: 5000 });
      }
    }
  }

  /**
   * トピックの保存
   */
  async save() {
    console.log(this.topic);
    try {
      const savedTopic: any = await this.topicsService.saveTopic(this.topic);

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
    if (
      1 <= this.topic.searchCondition.keywords.length &&
      this.topic.searchCondition.keywords[this.topic.searchCondition.keywords.length - 1].length === 0
    ) {
      // 既に空のキーワードがあれば何もしない
      return;
    }
    this.topic.searchCondition.keywords.push('');
  }

  /**
   * 指定されたキーワードの削除
   * @param delete_keyword キーワード
   */
  deleteKeyword(deleteKeyword: string): void {
    this.topic.searchCondition.keywords = this.topic.searchCondition.keywords.filter(
      keyword => keyword !== deleteKeyword,
    );
  }

  /**
   * お手本分類ダイアログの表示
   */
  async openTrainerDialog() {
    // 設定状況を確認
    if (this.topic.searchCondition.keywords.length <= 0 || this.topic.searchCondition.keywords[0].length <= 0) {
      // キーワードが一つも登録されていなければ、エラーを表示
      this.snackBar.open('エラー: キーワードが一つも追加されていません。先にキーワードの追加を行ってください。', null, {
        duration: 5000,
      });
      return;
    }

    // ダイアログを開く
    const dialogRef = this.dialog.open(TrainerDialogComponent, {
      data: {
        crawlSocialAccountId: this.topic.crawlSocialAccount.id,
        searchCondition: this.topic.searchCondition,
        // 前回のお手本分類の結果 (お手本分類の編集を行う場合のために)
        tweets: this.topic.trainingTweets || null,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      // 手動分類の結果を取得
      this.topic.trainingTweets = result.tweets;
      // 全てのツイートフィルタパターンのスコアをリセット
      this.cleanScoreOfAllTweetFilterPatterns();
    });
  }

  /**
   * トレーニング＆検証ダイアログの表示
   * @param filterPatternIndex 使用するツイートフィルタパターンのインデックス番号
   */
  async openTrainingAndValidationDialog(filterPatternIndex: number = null) {
    if (filterPatternIndex === -1) {
      filterPatternIndex = this.topic.enabledFilterPatternIndex;
    }

    // 設定状況を確認
    if (this.topic.searchCondition.keywords.length <= 0 || this.topic.searchCondition.keywords[0].length <= 0) {
      // キーワードが一つも登録されていなければ、エラーを表示
      this.snackBar.open('エラー: キーワードが一つも追加されていません。先にキーワードの追加を行ってください。', null, {
        duration: 5000,
      });
      return;
    } else if (this.topic.trainingTweets.length <= 0) {
      // お手本分類が未実行ならば、エラーを表示
      this.snackBar.open('エラー: お手本分類がまだ行われていません。先にお手本分類を行ってください。', null, {
        duration: 5000,
      });
      return;
    } else if (this.topic.filterPatterns[this.topic.enabledFilterPatternIndex].filters.length <= 0) {
      // ツイートフィルタが一つも登録されていなければ、エラーを表示
      this.snackBar.open(
        'エラー: ツイートフィルタが一つも追加されていません。先にツイートフィルタの追加を行ってください。',
        null,
        {
          duration: 5000,
        },
      );
      return;
    }

    // ダイアログを開く
    const dialogRef = this.dialog.open(TrainingAndValidationDialogComponent, {
      data: {
        topicId: this.topic.id,
        filters: this.topic.filterPatterns[filterPatternIndex].filters,
        topicKeywords: this.topic.searchCondition.keywords,
        trainingTweets: this.topic.trainingTweets,
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      // 学習結果の学習モデルIDを取得
      const trainedModelId = result.trainedModelId;
      // 検証結果のスコアを取得
      const score = result.score;
      // 当該ツイートフィルタパターンに登録
      if (!this.topic.filterPatterns[filterPatternIndex]) {
        return;
      }
      this.topic.filterPatterns[filterPatternIndex].trainedModelId = trainedModelId;
      this.topic.filterPatterns[filterPatternIndex].score = score;
    });
  }

  /**
   * ツイートフィルタパターンの追加
   */
  addTweetFilterPattern(): void {
    // 現在のフィルタパターンのフィルタ設定を取得
    let currentFilters = [];
    if (this.topic.filterPatterns[this.topic.enabledFilterPatternIndex]) {
      // フィルタ設定をコピー
      currentFilters = JSON.parse(
        JSON.stringify(this.topic.filterPatterns[this.topic.enabledFilterPatternIndex].filters),
      );
    }
    // 新しいツイートフィルタパターン名を決定
    let filterPatternNameNumber = 0;
    for (const pattern of this.topic.filterPatterns) {
      if (pattern.name.match(/(\d+)$/)) {
        const num = parseInt(RegExp.$1, 10);
        if (filterPatternNameNumber < num) {
          filterPatternNameNumber = num;
        }
      }
    }
    filterPatternNameNumber++;

    // トピックへツイートフィルタパターンを追加
    this.topic.filterPatterns.push({
      name: `パターン ${filterPatternNameNumber}`,
      trainedModelId: null,
      score: null,
      filters: currentFilters,
    });

    // ツイートフィルタパターンのタブを切り替え
    this.tabGroup.selectedIndex = this.topic.filterPatterns.length - 1;
  }

  onChangeShowingFilterPatternTabIndex(index: number): void {
    this.currentShowingFilterPatternTabIndex = index;
  }

  /**
   * 全ツイートフィルタパターンのスコアのリセット
   */
  cleanScoreOfAllTweetFilterPatterns(): void {
    for (const filterPattern of this.topic.filterPatterns) {
      filterPattern.score = null;
    }
  }

  /**
   * 指定されたツイートフィルタパターンのスコアのリセット
   * @param filterPatternIndex フィルタパターンのインデックス番号 (未指定ならば現在有効なもの)
   */
  cleanScoreOfTweetFilterPattern(filterPatternIndex: number = null): void {
    if (filterPatternIndex == null) {
      filterPatternIndex = this.topic.enabledFilterPatternIndex;
    }

    if (!this.topic.filterPatterns[this.topic.enabledFilterPatternIndex]) {
      return;
    }

    this.topic.filterPatterns[this.topic.enabledFilterPatternIndex].score = null;
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

        // 現在表示中のツイートフィルタパターンへ当該ツイートフィルタを追加
        this.topic.filterPatterns[this.currentShowingFilterPatternTabIndex].filters.push({
          id: this.topicsService.getTweetFilterUid(choosedFilterName),
          filterName: choosedFilterName,
          settings: {},
        });

        // 現在のツイートフィルタパターンのスコアをリセット
        this.cleanScoreOfTweetFilterPattern(null);
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
          id: this.topicsService.getActionUid(choosedActionName),
          actionName: choosedActionName,
          settings: {},
        });
      });
  }

  /**
   * 指定されたツイートフィルタの削除
   * @param filterIndex ツイートフィルタのインデックス番号
   */
  deleteTweetFilterPattern(filterIndex: number) {
    // 当該ツイートフィルタパターンを削除
    this.topic.filterPatterns.splice(filterIndex, 1);

    // ツイートフィルタパターンのタブを切り替え
    this.tabGroup.selectedIndex = this.topic.filterPatterns.length - 1;
  }

  /**
   * 指定されたツイートフィルタの削除
   * @param filterIndex ツイートフィルタのインデックス番号
   */
  deleteTweetFilter(filterIndex: number) {
    // 現在表示中のツイートフィルタパターンから当該ツイートフィルタを削除
    this.topic.filterPatterns[this.currentShowingFilterPatternTabIndex].filters.splice(filterIndex, 1);

    // 現在のツイートフィルタパターンのスコアをリセット
    this.cleanScoreOfTweetFilterPattern(null);
  }

  /**
   * 指定されたアクションの削除
   * @param actionIndex アクションのインデックス番号
   */
  deleteAction(actionIndex: number) {
    this.topic.actions.splice(actionIndex, 1);
  }

  /**
   * 指定されたアクションの順序を上へ
   * @param actionIndex アクションのインデックス番号
   */
  moveActionToUp(actionIndex: number) {
    if (actionIndex === 0 || this.topic.actions.length === 0) return;

    this.topic.actions.splice(actionIndex - 1, 2, this.topic.actions[actionIndex], this.topic.actions[actionIndex - 1]);
  }
  /**
   * 指定されたアクションの順序を下へ
   * @param actionIndex アクションのインデックス番号
   */
  moveActionToDown(actionIndex: number) {
    if (this.topic.actions.length - 1 === actionIndex || this.topic.actions.length === 0) return;
    actionIndex += 1;
    this.topic.actions.splice(actionIndex - 1, 2, this.topic.actions[actionIndex], this.topic.actions[actionIndex - 1]);
  }

  /**
   * 指定されたアクション設定項目に対するテンプレート変数の追加
   * @param templateVariable テンプレート変数
   * @param actionIndex アクションのインデックス番号
   * @param settingItemName アクションの設定項目名
   */
  insertTemplateVariableToActionSettingField(templateVariable: string, actionIndex: string, settingItemName: string) {
    if (!this.topic.actions[actionIndex].settings[settingItemName]) {
      this.topic.actions[actionIndex].settings[settingItemName] = '';
    }
    this.topic.actions[actionIndex].settings[settingItemName] += `%${templateVariable}%`;
  }

  /**
   * 配列のアイテムを ngModel で入力欄へ双方向バインディングしたとき、入力毎にフォーカスが外れる問題の対策
   * @param index
   * @param obj
   */
  myTrackBy(index: number): any {
    return index;
  }
}
