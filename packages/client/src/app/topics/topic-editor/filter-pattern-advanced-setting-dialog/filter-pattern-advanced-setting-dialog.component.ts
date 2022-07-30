import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FilterPattern } from 'src/.api-client/models/filter-pattern';

/**
 * フィルタパターンの拡張設定ダイアログのコンポーネント
 */
@Component({
  selector: 'app-filter-pattern-advanced-setting-dialog',
  templateUrl: './filter-pattern-advanced-setting-dialog.component.html',
  styleUrls: ['./filter-pattern-advanced-setting-dialog.component.scss'],
})
export class FilterPatternAdvancedSettingDialogComponent implements OnInit {
  // トピックID
  topicId: number;

  // フィルタパターン
  filterPattern: FilterPattern;

  constructor(
    private dialogRef: MatDialogRef<FilterPatternAdvancedSettingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {
    // コンポーネントから渡された値を取得
    this.topicId = this.data.topicId;
    this.filterPattern = this.data.filterPattern;

    console.log(this.filterPattern);

    // 設定を初期化
    if (!this.filterPattern.settings) {
      this.filterPattern.settings = {
        // ディープラーニング分類器をトレーニングするときのエポック数
        numOfMlEpochs: 30,
        // ディープラーニング分類器をトレーニングするときの学習率
        mlLearningRate: 0.1,
        // ディープラーニング分類器をトレーニングするときの損失関数
        mlLossFunction: 'categoricalCrossentropy',
      };
    }
  }

  finish(): void {
    this.dialogRef.close({
      settings: this.filterPattern.settings,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
