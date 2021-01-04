import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  IsNull,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsEmpty } from 'class-validator';
import { SocialAccount } from '../../../social-accounts/entities/social-account.entity';

/**
 * 収集済みツイートのエンティティ
 */
@Entity()
@Index(['socialAccount', 'idStr'], { unique: true }) // TODO
export class CrawledTweet extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 収集日時
  @CreateDateColumn()
  @IsNotEmpty()
  crawledAt: Date;

  // 収集時に使用されたキーワード文字列
  @Column({
    nullable: true,
  })
  crawlKeyword: string;

  // ツイートの本文
  @Column()
  text: string;

  // ツイートのID文字列
  @Column()
  @IsNotEmpty()
  idStr: string;

  // ツイートの投稿日時
  @Column()
  @IsNotEmpty()
  createdAt: Date;

  // ツイート投稿者のID文字列
  @Column()
  userIdStr: string;

  // ツイート投稿者の名前 (例: 'arisu.cool')
  @Column()
  userName: string;

  // ツイート投稿者のスクリーンネーム (例: 'arisucool')
  @Column()
  userScreenName: string;

  // ツイートのURL
  @Column()
  url: string;

  // ツイートのリツイート数
  // (クロール済みツイートからリツイート (引用リツイートを除く) を独自にカウントしたもの)
  @Column({
    default: 0,
  })
  crawledRetweetCount: number;

  // ツイートのリツイートのID文字列
  // (クロール済みツイートからリツイート (引用リツイートを除く) を独自に抽出し、IDのみ保管しておくためのもの)
  @Column({
    type: 'text',
    array: true,
  })
  crawledRetweetIdStrs: string[];

  // 元ツイートのID文字列　(リツイートの場合)
  @Column({
    nullable: true,
  })
  originalIdStr: string;

  // 元ツイートの投稿日時
  @Column({
    nullable: true,
  })
  originalCreatedAt: Date;

  // 元ツイート投稿者のID文字列
  @Column({
    nullable: true,
  })
  originalUserIdStr: string;

  // 元ツイート投稿者の名前
  @Column({
    nullable: true,
  })
  originalUserName: string;

  // 元ツイート投稿者のスクリーンネーム
  @Column({
    nullable: true,
  })
  originalUserScreenName: string;

  // 収集時に使用されたソーシャルアカウント
  @ManyToOne(
    () => SocialAccount,
    socialAccount => socialAccount.crawledTweets,
  )
  socialAccount: SocialAccount;

  // JSONデータ
  @Column()
  @IsNotEmpty()
  rawJSONData: string;
}
