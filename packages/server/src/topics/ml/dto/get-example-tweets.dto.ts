import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsNumber } from 'class-validator';

/**
 * 学習用サンプルツイートを収集するための情報
 */
export class GetExampleTweetsDto {
  @ApiProperty({
    description: '収集に使用するソーシャルアカウントのID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  crawlSocialAccountId: number;

  @ApiProperty({
    description: '検索するためのキーワード',
    example: 'ありす',
    type: String,
  })
  @IsNotEmpty()
  keyword: string;
}
