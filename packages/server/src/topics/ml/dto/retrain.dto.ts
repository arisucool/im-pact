import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { Tweet } from '../entities/tweet.entity';
import { ExtractedTweet } from '../entities/extracted-tweet.entity';

/**
 * 再トレーニングを行うための情報
 */
export class ReTrainDto {
  @ApiProperty({
    description: 'トピックID',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  topicId: number;

  @ApiProperty({
    description: '再トレーニングに与えるツイート',
    example: {},
    type: ExtractedTweet,
  })
  @IsNotEmpty()
  tweet: ExtractedTweet;

  @ApiProperty({
    description: '当該ツイートが選択されたか否か (承認か拒否か)',
    example: true,
    type: Boolean,
  })
  @IsNotEmpty()
  isSelected: boolean;
}
