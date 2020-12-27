import { Strategy } from 'passport-local';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';

/**
 * ユーザIDおよびパスワードによる認証を行うためのストラテジ
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // passport-local の設定
      usernameField: 'id', // JSONのフィールド名 'username' の代わりに 'id' から取得
      passwordField: 'password',
    });
  }

  async validate(user_id: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(user_id, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
