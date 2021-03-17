import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsNumber } from 'class-validator';
import { FilterPattern } from '../entities/filter-pattern.entity';
import { SearchCondition } from '../entities/search-condition.interface';

/**
 * トピックを作成するための情報
 */
export class CreateTopicDto {
  @ApiProperty({
    description: 'トピック名',
    example: '橘ありすのイラスト',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '収集ソーシャルアカウントのID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  crawlSocialAccountId: number;

  @ApiProperty({
    description: '収集スケジュール (Cron 形式)',
    example: '0 * * * *',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  crawlSchedule: string;

  @ApiProperty({
    description: '検索条件',
    example: {
      keywords: ['橘', 'ありす'],
      language: 'ja',
      to: null,
      minFaves: 1,
      minRetweets: 1,
      minReplies: 0,
      images: true,
    },
    type: Object,
  })
  @IsNotEmpty()
  searchCondition: SearchCondition;

  @ApiProperty({
    description: 'フィルタパターン',
    example: [],
    type: Object,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  filterPatterns: FilterPattern[];

  @ApiProperty({
    description: '使用するフィルタパターンのインデックス番号',
    example: 0,
    type: Number,
  })
  @IsNotEmpty()
  enabledFilterPatternIndex: number;

  @ApiProperty({
    description: 'アクション',
    example: [],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  actions: string[];

  @ApiProperty({
    description: 'お手本分類されたツイート',
    example: [],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  trainingTweets: string[];
}
