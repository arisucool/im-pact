import { Component, OnInit } from '@angular/core';
import { DefaultService } from 'src/.api-client';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public currentUserId = null;

  constructor(private auth: AuthService) {}

  async ngOnInit() {
    this.currentUserId = await this.auth.getCurrentUserId();
  }

  async logout() {

    // ログアウトの実行
    this.auth.logout();

    // ログイン画面へ遷移
    window.location.href = '/auth/login';

  }

}
