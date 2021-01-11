import { Injectable } from '@angular/core';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

/**
 * シンプルなダイアログを表示するためのサービス
 */
@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * 確認ダイアログの表示
   * @param title タイトル
   * @param content 本文
   */
  async openConfirm(title: string, content: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // ダイアログを開く
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: title,
          content: content,
        },
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) return resolve(true);
        return resolve(false);
      });
    });
  }
}
