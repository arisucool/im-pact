import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { ClassifiedTweet } from '../entities/classified-tweet.entity';

/**
 * ツイートフィルタを再トレーニングするための情報
 */
export class TweetFilterRetrainingRequest {
  /**
   * ツイートフィルタID
   */
  @ApiProperty({
    description: 'ツイートフィルタのID',
    type: String,
  })
  filterId: string;

  /**
   * ツイートフィルタによる判定結果
   */
  @ApiProperty({
    description: 'ツイートフィルタによる判定結果',
    example: 'accept',
    type: String,
  })
  previousChoiceKey: string;

  /**
   * ユーザによる判定結果
   */
  @ApiProperty({
    description: 'ユーザによる判定結果',
    example: 'reject',
    type: String,
  })
  correctChoiceKey: string;
}

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
    type: ClassifiedTweet,
  })
  @IsNotEmpty()
  tweet: ClassifiedTweet;

  @ApiProperty({
    description: '当該ツイートが選択されたか否か (承認か拒否か)',
    example: true,
    type: Boolean,
  })
  @IsNotEmpty()
  isSelected: boolean;

  @ApiProperty({
    description: 'ツイートフィルタを再トレーニングするための情報',
    type: TweetFilterRetrainingRequest,
    isArray: true,
  })
  @IsNotEmpty()
  tweetFilterRetrainingRequests?: TweetFilterRetrainingRequest[];
}
