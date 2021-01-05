import { Component, OnInit, Inject } from '@angular/core';
import { TopicsService } from '../../topics.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * トレーニング＆検証ダイアログのコンポーネント
 */
@Component({
  selector: 'app-training-and-validation-dialog',
  templateUrl: './training-and-validation-dialog.component.html',
  styleUrls: ['./training-and-validation-dialog.component.scss'],
})
export class TrainingAndValidationDialogComponent implements OnInit {
  // 進捗状況
  status: string;

  // 検証結果
  validationResult = null;

  // 分類結果のツイート
  resultTweets: any[];

  // トピックID
  topicId: number;

  // フィルタ設定
  filters: [];

  // 手動分類の結果
  trainingTweets: [];

  constructor(
    private dialogRef: MatDialogRef<TrainingAndValidationDialogComponent>,
    private topicsService: TopicsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  async ngOnInit() {
    // コンポーネントから渡された値を取得
    this.topicId = this.data.topicId;
    this.trainingTweets = this.data.trainingTweets;
    this.filters = this.data.filters;
    // 初期化
    this.status = null;
    this.validationResult = null;
    // 学習＆検証を実行
    await this.trainAndValidate();
  }

  async trainAndValidate() {
    // 値を初期化
    this.resultTweets = null;
    // トレーニングおよび検証を実行
    this.status = 'AIが学習しています...';
    const result = (await this.topicsService.trainAndValidate(this.topicId, this.trainingTweets, this.filters)) as any;
    this.validationResult = result.validationResult;
    // 完了
    this.status = null;
  }

  finish() {
    this.dialogRef.close();
  }

  cancel() {
    this.dialogRef.close();
  }
}
