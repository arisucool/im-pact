import {
  Entity,
  Column,
  PrimaryColumn,
  BeforeInsert,
  BaseEntity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { CrawledTweet } from 'src/topics/ml/entities/crawled-tweet.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ExtractedTweet } from '../ml/entities/extracted-tweet.entity';

/**
 * トピックのエンティティ
 */
@Entity()
export class Topic extends BaseEntity {
  // ID
  @PrimaryGeneratedColumn()
  id: number;

  // トピック名 (例: "橘ありすのイラスト")
  @Column()
  @IsNotEmpty()
  name: string;

  // 収集アカウント
  @ManyToOne(
    () => SocialAccount,
    socialAccount => socialAccount.topics,
  )
  crawlSocialAccount: SocialAccount;

  // 収集アカウント
  @OneToMany(
    () => ExtractedTweet,
    extractedTweet => extractedTweet.topic,
  )
  extractedTweets: ExtractedTweet[];

  // 収集スケジュール (Cron 書式)
  @Column()
  @IsNotEmpty()
  crawlSchedule: string;

  // キーワード
  @Column({
    type: 'text',
    array: true,
  })
  keywords: string[];

  // ツイートフィルタ
  @Column({
    type: 'text',
    array: true,
  })
  filters: string[];

  // アクション
  @Column({
    type: 'text',
    array: true,
  })
  actions: string[];

  // お手本分類の結果
  @Column({
    type: 'text',
    array: true,
  })
  trainingTweets: string[];
}
