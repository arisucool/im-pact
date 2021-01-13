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
import { IsNotEmpty, IsEmpty, IsArray } from 'class-validator';
import { SocialAccount } from '../../../social-accounts/entities/social-account.entity';
import { Topic } from 'src/topics/entities/topic.entity';
import { CrawledTweet } from './crawled-tweet.entity';
import { Tweet } from './tweet.entity';

/**
 * 抽出済みツイートのエンティティ
 */
@Entity()
@Index(['topic', 'idStr'], { unique: true })
@Index(['topic', 'predictedClass', 'completeActionIndex'], { unique: false })
export class ExtractedTweet extends Tweet {
  @PrimaryGeneratedColumn()
  id: number;

  // 抽出日時
  @CreateDateColumn()
  @IsNotEmpty()
  extractedAt: Date;

  // 収集時に使用されたソーシャルアカウント
  @ManyToOne(
    () => SocialAccount,
    socialAccount => socialAccount.crawledTweets,
  )
  socialAccount: SocialAccount;

  // トピック
  @ManyToOne(
    () => Topic,
    topic => topic.extractedTweets,
  )
  topic: Topic;

  // ツイートの分類クラス ('accept' or 'reject')
  @Column()
  @IsNotEmpty()
  predictedClass: string;

  // ツイートフィルタの結果
  @Column({
    type: 'text',
    array: true,
  })
  filtersResult: string[];

  // 完了したアクションのインデックス番号
  @Column({
    default: -1,
  })
  completeActionIndex: number;

  // 最後に実行されたアクションのインデックス番号 (保留またはエラーであっても更新される)
  @Column({
    default: -1,
  })
  lastActionIndex: number;

  // 最後に実行されたアクションの実行日時 (保留またはエラーであっても更新される)
  @Column({
    nullable: true,
  })
  lastActionExecutedAt: Date;

  // 最後に実行されたアクションのエラー (エラーであれば更新される)
  @Column({
    type: 'text',
    nullable: true,
  })
  lastActionError: string;
}
