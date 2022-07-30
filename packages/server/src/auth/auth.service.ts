import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/users/entities/user.entity';

/**
 * ユーザ認証のためのサービス
 */
@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  /**
   * 指定されたユーザIDおよびパスワードによるユーザの認証
   * @param user_id ユーザID
   * @param user_pw ユーザパスワード
   */
  async validateUser(user_id: string, user_pw: string): Promise<User> {
    const user = await this.usersService.validate(user_id, user_pw);
    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * ログイン
   * @param login_dto ログインするための情報
   */
  login(login_dto: LoginDto): { access_token: string } {
    const payload = {
      id: login_dto.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
