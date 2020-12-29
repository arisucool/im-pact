import { Injectable } from '@angular/core';
import { DefaultService, LoginDto } from 'src/.api-client';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentAccessToken = null;
  private currentUserId = null;
  private currentUser = null;

  constructor(private api: DefaultService) {
    // セッション情報を LocalStorage から読み出し
    this.currentAccessToken = window.localStorage.getItem('im_pact_token');
    this.currentUserId = window.localStorage.getItem('im_pact_user_id');
    if (!this.currentAccessToken || !this.currentUserId) {
      this.clearSession();
      return;
    }

    // アクセストークンを設定
    this.api.configuration.accessToken = this.currentAccessToken;

  }

  /**
   * 現在のユーザIDの取得
   * @return ユーザID
   */
  async getCurrentUserId(): Promise<string> {
    if (this.currentUserId === null) {
      return null;
    }

    if (this.currentUser === null) {
      // ユーザ情報を取得
      this.currentUser = await this.getCurrentUser();
    }

    return this.currentUserId;
  }

  /**
   * 現在のユーザの取得
   */
  async getCurrentUser() {
    this.currentUser = await this.api.usersControllerFindOne(this.currentUserId).toPromise();
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
    let result: any;
    try {
      result = await this.api.authControllerLogin(loginDto).toPromise();
    } catch (e) {
      return false;
    }
    if (!result || !result.access_token) {
      return false;
    }

    const access_token = result.access_token;

    // セッション情報を記憶
    window.localStorage.setItem('im_pact_user_id', userId);
    window.localStorage.setItem('im_pact_token', access_token);

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

    this.currentUserId = null;
    window.localStorage.removeItem('im_pact_user_id');

    this.currentAccessToken = null;
    window.localStorage.removeItem('im_pact_token');

  }

}
