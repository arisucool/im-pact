import { ApiProperty } from '@nestjs/swagger';
import { TweetFilterRetrainingRequest } from '../ml/dto/retrain.dto';

export class RejectTweetDto {
  topicId: number;
  extractedTweetId: number;

  @ApiProperty({
    description: 'ツイートフィルタを再トレーニングするための情報',
    type: TweetFilterRetrainingRequest,
    isArray: true,
  })
  tweetFilterRetrainingRequests: TweetFilterRetrainingRequest[];
}
