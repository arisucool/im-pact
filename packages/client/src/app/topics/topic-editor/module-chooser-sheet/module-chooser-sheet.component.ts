import { Component, Inject, OnInit } from '@angular/core';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { TopicsService } from '../../topics.service';

/**
 * モジュール選択シートのコンポーネント
 * (ツイートフィルタまたはアクションを追加するときに用いられる)
 */
@Component({
  selector: 'module-chooser-sheet',
  templateUrl: './module-chooser-sheet.component.html',
})
export class ModuleChooserSheetComponent implements OnInit {
  // 選択を求めるモジュールの種類
  moduleType = null;
  // 選択肢
  items = [];

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private _bottomSheetRef: MatBottomSheetRef<ModuleChooserSheetComponent>,
    private topicsService: TopicsService,
  ) {
    this.moduleType = data.moduleType || null;
  }

  async ngOnInit() {
    await this.initItems();
  }

  /**
   * 選択肢の初期化
   */
  async initItems() {
    if (this.moduleType === null) return;

    let itemsObject = {};

    if (this.moduleType === 'ACTION') {
      // アクション
      itemsObject = await this.topicsService.getAvailableActions();
    } else if (this.moduleType === 'TWEET_FILTER') {
      // ツイートフィルタ
      itemsObject = await this.topicsService.getAvailableTweetFilters();
    }

    // 連想配列から配列へ変換
    this.items = [];
    for (let key of Object.keys(itemsObject)) {
      const item = itemsObject[key];
      item.name = key;
      this.items.push(item);
    }
  }

  /**
   * アイテムがクリックされたときに呼び出されるイベントハンドラ
   * @param item_name 選ばれた選択肢
   * @param event マウスイベント
   */
  onItemClick(item_name: string, event: MouseEvent): void {
    // ボトムシートを閉じて、呼出元へ選択されたアイテムを返す
    this._bottomSheetRef.dismiss(item_name);
    event.preventDefault();
  }
}
