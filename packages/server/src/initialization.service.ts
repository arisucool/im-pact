import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { CreateUserDto } from './users/dto/create-user.dto';

/**
 * 初期化処理のためのサービス
 */
@Injectable()
export class InitializationService implements OnApplicationBootstrap {
  constructor(private readonly userService: UsersService) {}

  async onApplicationBootstrap() {
    await this.createInitialUser();
  }

  /**
   * 初期ユーザの作成
   */
  async createInitialUser() {
    if (await this.userService.existsAccount()) {
      // ユーザが存在するならば
      return;
    }

    console.log('Creating initial user... arisu');
    const dto = new CreateUserDto();
    dto.id = 'arisu';
    dto.password = '15-pasta';
    this.userService.create(dto);
  }
}
