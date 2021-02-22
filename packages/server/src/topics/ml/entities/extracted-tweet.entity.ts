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
import { Tweet } from './tweet.entity';
import { TweetFilterResultWithMultiValues } from '../modules/tweet-filters/interfaces/tweet-filter.interface';
import { ApiResponseProperty } from '@nestjs/swagger';

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
  @ApiResponseProperty()
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
  @ApiResponseProperty()
  predictedClass: string;

  // ツイートフィルタの結果
  @Column({
    type: 'json',
    default: '{}',
  })
  @ApiResponseProperty()
  filtersResult: {
    filterName: string;
    result: TweetFilterResultWithMultiValues;
  }[];

  // 完了したアクションのインデックス番号
  @Column({
    default: -1,
  })
  @ApiResponseProperty()
  completeActionIndex: number;

  // 最後に実行されたアクションのインデックス番号 (保留またはエラーであっても更新される)
  @Column({
    default: -1,
  })
  @ApiResponseProperty()
  lastActionIndex: number;

  // 最後に実行されたアクションの実行日時 (保留またはエラーであっても更新される)
  @Column({
    nullable: true,
  })
  @ApiResponseProperty()
  lastActionExecutedAt: Date;

  // 最後に実行されたアクションのエラー (エラーであれば更新される)
  @Column({
    type: 'text',
    nullable: true,
  })
  @ApiResponseProperty()
  lastActionError: string;
}
