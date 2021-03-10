import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { SearchCondition } from 'src/topics/entities/search-condition.interface';

/**
 * 学習用サンプルツイートを収集するための情報
 */
export class CrawlExampleTweetsDto {
  @ApiProperty({
    description: '収集に使用するソーシャルアカウントのID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  crawlSocialAccountId: number;

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
}
