import { Component, OnInit, Inject } from '@angular/core';
import { TopicsService } from '../../topics.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FilterPattern, FilterPatternSettings } from 'src/.api-client';

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
  isLoading: boolean;
  status: string;

  // 学習結果
  trainingResult = null;

  // 検証結果
  validationResult = null;
  numOfTweets = 0;
  numOfCorrectTweets = 0;
  numOfIncorrectTweets = 0;
  tweets: any[];

  // 絞り込みモード
  filterMode = 'all';

  // トピックID
  topicId: number;
  // トピックのキーワード
  topicKeywords: string[];

  // フィルタ設定
  filters: [];

  // フィルタパターンの拡張設定 (ハイパーパラメータなど)
  filterPatternSettings: FilterPatternSettings;

  // 手動分類の結果
  trainingTweets: [];

  constructor(
    private dialogRef: MatDialogRef<TrainingAndValidationDialogComponent>,
    private topicsService: TopicsService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  async ngOnInit() {
    // コンポーネントから渡された値を取得
    this.topicId = this.data.topicId;
    this.topicKeywords = this.data.topicKeywords;
    this.trainingTweets = this.data.trainingTweets;
    this.filters = this.data.filters;
    this.filterPatternSettings = this.data.filterPatternSettings;
    // 初期化
    this.status = null;
    this.isLoading = true;
    // 学習＆検証を実行
    await this.trainAndValidate();
  }

  async onChangeFilterMode() {
    this.loadTweets();
  }

  finish() {
    this.dialogRef.close({
      // 学習モデルIDを呼び出し元のコンポーネントへ渡す
      trainedModelId: this.trainingResult.trainedModelId,
      // 点数を呼び出し元のコンポーネントへ渡す
      score: this.validationResult.score,
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  analyze() {
    // ファイル名の postfix を取得
    const filenamePostfix = new Date().getTime().toString();

    // ベクトルTSVファイルを保存
    this.saveAsFileByTsvData(`vectors-${filenamePostfix}.tsv`, this.validationResult.embedding.vectorsTsv);
    // メタデータTSVファイルを保存
    this.saveAsFileByTsvData(`metadata-${filenamePostfix}.tsv`, this.validationResult.embedding.metadatasTsv);

    // メッセージを表示
    this.snackBar
      .open(
        '2件のTSVファイルを出力しました。Embedding Projector にて [Load] ボタンをクリックし、読み込ませてください。',
        'Embedding Projector へ',
        {
          duration: 15000,
        },
      )
      .onAction()
      .subscribe(() => {
        // Embedding Projector を開く
        const open = window.open();
        open.opener = null;
        open.location = 'https://projector.tensorflow.org/' as any;
      });
  }

  saveAsFileByTsvData(filename: string, data: string): void {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, data], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);

    // ファイルを保存
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 解放
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  }

  protected async trainAndValidate() {
    // 値を初期化
    this.tweets = null;
    this.validationResult = null;
    this.numOfTweets = 0;
    this.numOfCorrectTweets = 0;
    this.numOfIncorrectTweets = 0;

    // トレーニングおよび検証を実行
    this.status = 'AIがトレーニングしています...';
    let trainingResult = null;
    let validationResult = null;
    try {
      const result = await this.topicsService.trainAndValidate(
        this.topicId,
        this.trainingTweets,
        this.filters,
        this.filterPatternSettings,
        this.topicKeywords,
      );
      trainingResult = result.trainingResult;
      validationResult = result.validationResult;
    } catch (e) {
      this.isLoading = false;
      this.status = `エラー: ${e.error?.message}`;
      this.snackBar.open(`エラー: トレーニング＆検証において問題が発生しました`, null, {
        duration: 5000,
      });
      return;
    }
    this.trainingResult = trainingResult;
    this.validationResult = validationResult;
    this.numOfTweets = this.validationResult.classifiedTweets.length;

    // 正解数・不正解数の算出
    for (const tweet of this.validationResult.classifiedTweets) {
      if (tweet.predictedSelect === tweet.selected) {
        this.numOfCorrectTweets++;
      } else {
        this.numOfIncorrectTweets++;
      }
    }

    // デフォルトの絞り込みモードの選択
    if (1 <= this.numOfIncorrectTweets) {
      // 不正解が1件でもあれば
      this.filterMode = 'incorrect';
    } else {
      this.filterMode = 'all';
    }

    // 絞り込みおよびソートの適用
    this.loadTweets();

    // 完了
    this.isLoading = false;
    this.status = null;
  }

  protected loadTweets() {
    // 検証結果からツイートを取得
    let tweets = this.validationResult.classifiedTweets;

    // 絞り込み
    if (this.filterMode === 'correct') {
      // 正解ツイートのみならば
      tweets = tweets.filter((tweet: any) => tweet.predictedSelect === tweet.selected);
    } else if (this.filterMode === 'incorrect') {
      // 不正解ツイートのみならば
      tweets = tweets.filter((tweet: any) => tweet.predictedSelect !== tweet.selected);
    }

    // リツイート数でソート
    tweets = tweets.sort((a: any, b: any) => b.crawledRetweetCount - a.crawledRetweetCount);

    // ツイートの表示
    this.tweets = tweets;
  }
}
