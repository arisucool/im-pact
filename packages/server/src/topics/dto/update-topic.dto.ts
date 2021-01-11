import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsNumber } from 'class-validator';

/**
 * トピックを更新するための情報
 */
export class UpdateTopicDto {
  @ApiProperty({
    description: 'トピックID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: 'トピック名',
    example: '橘ありすのイラスト',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '収集スケジュール (Cron 形式)',
    example: '0 * * * *',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  crawlSchedule: string;

  @ApiProperty({
    description: 'キーワード',
    example: ['橘', 'ありす'],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  keywords: string[];

  @ApiProperty({
    description: 'フィルタパターン',
    example: [],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  filterPatterns: string[];

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
