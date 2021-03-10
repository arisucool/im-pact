import { PrimaryGeneratedColumn, CreateDateColumn, Column, ManyToOne, BaseEntity } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ApiResponseProperty } from '@nestjs/swagger';

export abstract class Tweet extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 収集日時
  @CreateDateColumn()
  @IsNotEmpty()
  @ApiResponseProperty()
  crawledAt: Date;

  // 収集時に使用されたクエリ文字列
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  crawlQuery: string;

  // 収集時に使用された検索言語
  @Column({
    nullable: false,
    default: 'ja',
  })
  @ApiResponseProperty()
  crawlLanguage: string;

  // ツイートの本文
  @Column()
  @ApiResponseProperty()
  text: string;

  // ツイートのID文字列
  @Column()
  @IsNotEmpty()
  @ApiResponseProperty()
  idStr: string;

  // ツイートの投稿日時
  @Column()
  @IsNotEmpty()
  @ApiResponseProperty()
  createdAt: Date;

  // ツイート投稿者のID文字列
  @Column()
  @ApiResponseProperty()
  userIdStr: string;

  // ツイート投稿者の名前 (例: 'arisu.cool')
  @Column()
  @ApiResponseProperty()
  userName: string;

  // ツイート投稿者のスクリーンネーム (例: 'arisucool')
  @Column()
  @ApiResponseProperty()
  userScreenName: string;

  // ツイートのURL
  @Column()
  @ApiResponseProperty()
  url: string;

  // ツイートの画像URL
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    default: () => 'array[]::text[]',
  })
  @ApiResponseProperty()
  imageUrls: string[];

  // ツイートのハッシュタグ
  @Column({
    type: 'text',
    array: true,
  })
  @ApiResponseProperty()
  hashtags: string[];

  // ツイートのリツイート数
  // (クロール済みツイートからリツイート (引用リツイートを除く) を独自にカウントしたもの)
  @Column({
    default: 0,
  })
  @ApiResponseProperty()
  crawledRetweetCount: number;

  // ツイートのリツイートのID文字列
  // (クロール済みツイートからリツイート (引用リツイートを除く) を独自に抽出し、IDのみ保管しておくためのもの)
  @Column({
    type: 'text',
    array: true,
  })
  @ApiResponseProperty()
  crawledRetweetIdStrs: string[];

  // 元ツイートのID文字列　(リツイートの場合)
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  originalIdStr: string;

  // 元ツイートの投稿日時
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  originalCreatedAt: Date;

  // 元ツイート投稿者のID文字列
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  originalUserIdStr: string;

  // 元ツイート投稿者の名前
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  originalUserName: string;

  // 元ツイート投稿者のスクリーンネーム
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  originalUserScreenName: string;

  // JSONデータ
  @Column()
  @IsNotEmpty()
  @ApiResponseProperty()
  rawJSONData: string;

  // モジュールのデータ
  @Column({
    default: '{}',
  })
  @IsNotEmpty()
  @ApiResponseProperty()
  moduleData: string;
}
