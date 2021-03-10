import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate() {
    // 現在のユーザIDを取得
    const userId = await this.auth.getCurrentUserId();
    if (userId === null) {
      // 未ログインならば
      return false;
    }

    return true;
  }
}
