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
    description: 'お手本分類されたツイート',
    example: [],
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  trainingTweets: string[];
}
