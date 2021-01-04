import { Component, OnInit, Inject } from '@angular/core';
import { TopicsService } from '../../topics.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TrainerDialogComponent } from '../trainer-dialog/trainer-dialog.component';

/**
 * トレーニング＆検証ダイアログのコンポーネント
 */
@Component({
  selector: 'app-training-dialog',
  templateUrl: './training-dialog.component.html',
  styleUrls: ['./training-dialog.component.scss'],
})
export class TrainingDialogComponent implements OnInit {
  // 進捗状況
  status: string;

  // 分類結果のツイート
  resultTweets: any[];

  // キーワード設定
  keywords: [];

  // フィルタ設定
  filters: [];

  // 手動分類の結果
  trainingTweets: [];

  constructor(
    private dialogRef: MatDialogRef<TrainerDialogComponent>,
    private topicsService: TopicsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  async ngOnInit() {
    // コンポーネントから渡された値を取得
    this.trainingTweets = this.data.trainingTweets;
    this.keywords = this.data.keywords;
    this.filters = this.data.filters;
    // 学習＆検証を実行
    await this.trainAndValidate();
  }

  async trainAndValidate() {
    // 値を初期化
    this.resultTweets = null;
    // 学習を実行
    this.status = 'AIが学習しています...';
    const trainedModel = await this.topicsService.train(this.trainingTweets, this.filters);
    // 検証を実行
    this.status = 'AIの学習結果を検証しています...';
    this.resultTweets = await this.topicsService.validate(trainedModel, this.trainingTweets);
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
