import { Injectable } from '@angular/core';
import { ApiService } from 'src/.api-client/services/api.service';
import { LoginDto } from 'src/.api-client/models/login-dto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserId: string = null;
  private currentUser: any = null;

  constructor(private api: ApiService) {}

  /**
   * 現在のユーザIDの取得
   * @return ユーザID
   */
  async getCurrentUserId(): Promise<string> {
    if (!this.currentUserId) {
      await this.loadSession();
    }

    if (this.currentUser === null) {
      // ユーザ情報を取得
      try {
        this.currentUser = await this.getCurrentUser();
      } catch (e) {
        console.warn(e);
        return null;
      }
    }

    console.log('ID = ', this.currentUserId);
    return this.currentUserId;
  }

  /**
   * 現在のユーザの取得
   */
  async getCurrentUser() {
    if (!this.currentUserId) {
      await this.loadSession();
    }

    this.currentUser = await this.api
      .usersControllerFindOne({
        id: this.currentUserId,
      })
      .toPromise();
    if (!this.currentUser) {
      this.currentUserId = null;
      return;
    }

    console.log('ID A = ', this.currentUser);
    this.currentUserId = this.currentUser.id;
    return this.currentUser;
  }

  /**
   * ログインの実行
   * @param userId ユーザID
   * @param userPassword ユーザパスワード
   * @return ログインに成功したか否か
   */
  async login(userId: string, userPassword: string): Promise<boolean> {
    // ログインを実行
    const loginDto: LoginDto = {
      id: userId,
      password: userPassword,
    };
    const accessToken: any = await this.api.authControllerLogin({ body: loginDto }).toPromise();
    if (!accessToken || accessToken.access_token === undefined) {
      return false;
    }

    // セッション情報を記憶
    window.localStorage.setItem('im_pact_user_id', userId);
    window.localStorage.setItem('im_pact_token', accessToken.access_token);

    return true;
  }

  /**
   * ログアウトの実行
   */
  async logout() {
    this.clearSession();
  }

  /**
   * セッション情報のクリア
   */
  protected clearSession() {
    window.localStorage.removeItem('im_pact_user_id');
    window.localStorage.removeItem('im_pact_token');
  }

  protected loadSession(): Promise<void> {
    const userId = window.localStorage.getItem('im_pact_user_id');
    if (!userId) {
      return;
    }
    this.currentUserId = userId;
  }
}
