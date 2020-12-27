import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

/**
 * ユーザ情報を読み書きするためのサービス
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * 指定されたユーザの作成
   * @param createUserDto ユーザを作成するための情報
   */
  async create(createUserDto: CreateUserDto) {
    const user = new User();
    user.id = createUserDto.id;
    user.password = createUserDto.password;
    user.save();
  }

  /**
   * 全てのユーザの取得
   */
  findAll() {
    return this.usersRepository.find();
  }

  /**
   * 指定されたユーザの取得
   * @param id ユーザID
   */
  async findOne(id: string) {
    const user: User = await this.usersRepository.findOne(id);
    if (user === undefined) {
      throw new BadRequestException('Invalid user');
    }
    return user;
  }

  /**
   * 指定されたユーザの削除
   * @param id ユーザID
   */
  async remove(id: string) {
    const user: User = await this.usersRepository.findOne(id);
    if (user === undefined) {
      throw new BadRequestException('Invalid user');
    }
    user.remove();
  }

  /**
   * 指定されたIDおよびパスワードの組み合わせが正しければユーザを返す
   * @return ユーザ
   * @param id ユーザID
   * @param password ユーザパスワード
   */
  async validate(id: string, password: string) {
    // データベースからユーザを取得
    const user: User = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: id })
      .addSelect('user.password')
      .getOne();

    // パスワードをハッシュ化して照合
    if (user === undefined || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException();
    }

    return user;
  }

  /**
   * アカウントが存在するか
   * @return アカウントが一つ以上存在するか
   */
  async existsAccount(): Promise<boolean> {
    if (0 == (await this.usersRepository.find()).length) {
      return false;
    }

    return true;
  }
}
