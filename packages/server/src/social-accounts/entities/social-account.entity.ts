import { Entity, Column, PrimaryColumn, BeforeInsert, BaseEntity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { CrawledTweet } from 'src/topics/ml/entities/crawled-tweet.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { ClassifiedTweet } from 'src/topics/ml/entities/classified-tweet.entity';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty()
  id: number;

  // 表示名 (例: "@arisucool")
  @Column()
  @IsNotEmpty()
  @ApiProperty()
  displayName: string;

  // サービス名
  @Column({
    type: 'enum',
    enum: SocialService,
    default: SocialService.TWITTER,
  })
  @IsNotEmpty()
  @ApiProperty()
  serviceName: SocialService;

  // アクセストークン
  @Column()
  @IsNotEmpty()
  accessToken: string;

  // アクセストークンシークレット
  @Column()
  accessTokenSecret: string;

  // トピック
  @OneToMany(
    () => Topic,
    topic => topic.crawlSocialAccount,
  )
  @ApiProperty()
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
