import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * ログイン画面のコンポーネント
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public userId = null;
  public userPassword = null;
  public errorMessage = null;

  constructor(private auth: AuthService) {}

  async ngOnInit() {
    // 現在のログイン状態を取得
    const userId = await this.auth.getCurrentUserId();
    if (userId !== null) {
      // ログイン済みならば
      // ホーム画面へ遷移
      window.location.href = '/home';
      return;
    }
  }

  /**
   * ログインフォームが送信されたときに呼び出されるメソッド
   */
  async onSubmit() {
    await this.login();
  }

  /**
   * ログイン
   */
  async login() {
    this.errorMessage = null;

    // ログインを実行
    if (!(await this.auth.login(this.userId, this.userPassword))) {
      // 失敗したならば
      this.errorMessage = 'エラー: ログインに失敗しました';
      return;
    }

    // ログイン画面へ遷移
    window.location.href = '/auth/login';
  }
}
