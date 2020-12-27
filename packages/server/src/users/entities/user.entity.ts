import { Entity, Column, PrimaryColumn, BeforeInsert, BaseEntity } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * ユーザ情報のエンティティ
 */
@Entity()
export class User extends BaseEntity {
  @PrimaryColumn({ length: 20 })
  id: string;

  @Column({
    length: 128,
    select: false, // データベースから取得しない
  })
  password: string;

  /**
   * パスワードを保存する前にハッシュ化するためのリスナ
   */
  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
