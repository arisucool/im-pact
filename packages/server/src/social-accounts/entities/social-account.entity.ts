import { Entity, Column, PrimaryColumn, BeforeInsert, BaseEntity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { CrawledTweet } from 'src/topics/ml/entities/crawled-tweet.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { ClassifiedTweet } from 'src/topics/ml/entities/classified-tweet.entity';

export enum SocialService {
  TWITTER = 'twitter',
}

/**
 * 収集用ソーシャルアカウントのエンティティ
 */
@Entity()
export class SocialAccount extends BaseEntity {
  // ID
  @PrimaryGeneratedColumn()
  id: number;

  // 表示名 (例: "@arisucool")
  @Column()
  @IsNotEmpty()
  displayName: string;

  // サービス名
  @Column({
    type: 'enum',
    enum: SocialService,
    default: SocialService.TWITTER,
  })
  @IsNotEmpty()
  serviceName: SocialService;

  // アクセストークン
  @Column()
  @IsNotEmpty()
  accessToken: string;

  // アクセストークンシークレット
  @Column()
  accessTokenSecret: string;

  // リフレッシュトークン (あれば)
  @Column({
    select: false, // データベースから取得しない
  })
  refreshToken: string;

  // トピック
  @OneToMany(
    () => Topic,
    topic => topic.crawlSocialAccount,
  )
  topics: Topic[];

  // 収集済みツイート
  @OneToMany(
    () => CrawledTweet,
    crawledTweet => crawledTweet.socialAccount,
  )
  crawledTweets: CrawledTweet[];

  // 分類済みツイート
  @OneToMany(
    () => ClassifiedTweet,
    classifiedTweet => classifiedTweet.socialAccount,
  )
  classifiedTweets: ClassifiedTweet[];
}
