import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

/**
 * 確認ダイアログのコンポーネント
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: [],
})
export class ConfirmDialogComponent implements OnInit {
  public title: string;
  public content: string;

  constructor(private dialogRef: MatDialogRef<ConfirmDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  /**
   * 初期化
   */
  async ngOnInit() {
    // コンポーネントから渡された値を取得
    this.title = this.data.title;
    this.content = this.data.content;
  }

  /**
   * OK
   */
  ok() {
    this.dialogRef.close(true);
  }

  /**
   * キャンセル
   */
  cancel() {
    this.dialogRef.close();
  }
}
