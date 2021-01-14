import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsNumber } from 'class-validator';

/**
 * トレーニングおよび検証を行うための情報
 */
export class TrainAndValidateDto {
  @ApiProperty({
    description: 'トピックID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  topicId: number;

  @ApiProperty({
    description: 'フィルタ',
    example: [],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  filters: string[];

  @ApiProperty({
    description:
      'キーワード (実際に検索が行われるわけではない。ベイジアンフィルタ等で学習からキーワードを除いて精度を上げる場合などに使用される。)',
    example: ['ありす'],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  topicKeywords: string[];

  @ApiProperty({
    description: 'お手本分類されたツイート',
    example: [],
    type: Object,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  trainingTweets: any[];
}
