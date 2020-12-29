import { Component, OnInit } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ModuleChooserSheetComponent } from './module-chooser-sheet.component';
import { TopicsService } from '../topics.service';

@Component({
  selector: 'app-topic-editor',
  templateUrl: './topic-editor.component.html',
  styleUrls: ['./topic-editor.component.scss'],
})
export class TopicEditorComponent implements OnInit {
  // トピック
  topic = {
    // トピック名
    name: null,
    // 収集アカウント
    crawlAccount: null,
    // 収集スケジュール
    crawlSchedule: null,
    // キーワード
    keywords: [],
    // ツイートフィルタ
    filters: [],
    // アクション
    actions: [],
  };
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

  constructor(private topicsService: TopicsService, private bottomSheet: MatBottomSheet) {}

  async ngOnInit() {
    await this.loadTopic();
  }

  /**
   * トピックの読み込み
   */
  async loadTopic() {
    // 利用可能なツイートフィルタを読み込み
    this.availableTweetFilters = await this.topicsService.getAvailableTweetFilters();

    // 利用可能なアクションを読み込み
    this.availableActions = await this.topicsService.getAvailableActions();

    // ダミーのトピックデータ
    this.topic = {
      name: '橘ありすのイラスト',
      crawlAccount: null,
      crawlSchedule: null,
      keywords: ['橘', 'ありす', 'スウィート・ソアー'],
      filters: [
        { name: 'TfIllustImageClassicationFilter', settings: {} },
        { name: 'TweetTextRegExpFilter', settings: { regexp_pattern: '(ー|[ァ-ン])+・{0,1}タチバナ' } },
      ],
      actions: [
        {
          name: 'ApprovalOnDiscordAction',
          settings: {
            webhook_url: 'https://discordapp.com/api/webhooks/000000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxx',
            content_template: `ツイートを収集しました。
            %TWEET_URL%

            承認: %APPROVAL_URL%

            拒否: %REJECTION_URL%`,
          },
        },
      ],
    };
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
}
