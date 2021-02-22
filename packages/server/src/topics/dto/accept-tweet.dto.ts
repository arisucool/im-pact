import { RejectTweetDto } from './reject-tweet.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class AcceptTweetDto extends RejectTweetDto {
  @ApiProperty({
    description: 'ツイートの遷移先となるアクション番号',
    example: 0,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  destinationActionIndex: number;
}
