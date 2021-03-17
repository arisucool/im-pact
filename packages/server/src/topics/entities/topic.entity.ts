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
import { IsNotEmpty, IsArray } from 'class-validator';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { ClassifiedTweet } from '../ml/entities/classified-tweet.entity';
import { MlModel } from '../ml/entities/ml-model.entity';
import { SearchCondition } from './search-condition.interface';
import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import { FilterPattern } from './filter-pattern.entity';

/**
 * トピックのエンティティ
 */
@Entity()
export class Topic extends BaseEntity {
  // ID
  @PrimaryGeneratedColumn()
  @ApiProperty({
    type: Number,
    readOnly: true,
  })
  id: number;

  // トピック名 (例: "橘ありすのイラスト")
  @Column()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
  })
  name: string;

  // 収集アカウント
  @ManyToOne(
    () => SocialAccount,
    socialAccount => socialAccount.topics,
  )
  crawlSocialAccount: SocialAccount;

  // 分類済みツイート
  @OneToMany(
    () => ClassifiedTweet,
    classifiedTweet => classifiedTweet.topic,
  )
  classifiedTweets: ClassifiedTweet[];

  // 学習モデル
  @OneToMany(
    () => MlModel,
    mlModel => mlModel.topic,
  )
  @ApiResponseProperty({
    type: [MlModel],
  })
  mlModels: MlModel;

  // 収集スケジュール (Cron 書式)
  @Column()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    example: '* * * * *',
  })
  crawlSchedule: string;

  // 検索条件
  @Column('json')
  @ApiProperty({
    type: Object,
  })
  searchCondition: SearchCondition;

  // ツイートフィルタパターン
  @Column({
    type: 'json',
    default: '{}',
  })
  @IsArray()
  @ApiProperty({
    type: [FilterPattern],
  })
  filterPatterns?: FilterPattern[];

  // 使用するフィルタパターンのインデックス番号
  @Column()
  @ApiProperty({
    type: Number,
  })
  enabledFilterPatternIndex: number;

  // アクション
  @Column({
    type: 'text',
    array: true,
  })
  @ApiProperty({
    type: [String],
  })
  actions: string[];

  // お手本分類の結果
  @Column({
    type: 'text',
    array: true,
  })
  @ApiProperty({
    type: [String],
  })
  trainingTweets: string[];
}
