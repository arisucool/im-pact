import { Controller, UseGuards, Post, HttpCode, Body, ValidationPipe, Get } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import { MlService } from './ml.service';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';

@Controller('ml')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MlController {
  constructor(private mlService: MlService) {}

  /**
   * 指定されたお手本分類結果とフィルタ設定による学習および学習結果の検証
   */
  @Post('trainAndValidate')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたお手本分類結果とフィルタ設定による学習および学習結果の検証' })
  @ApiOkResponse({
    type: Object,
    description: 'トレーニングおよび検証の結果',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  trainAndValidate(@Body(ValidationPipe) dto: TrainAndValidateDto): Promise<any> {
    return this.mlService.trainAndValidate(dto);
  }

  /**
   * 学習用サンプルツイートの収集・取得
   */
  @Post('exampleTweets')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '学習用サンプルツイートの収集・取得' })
  @ApiOkResponse({
    type: CrawledTweet,
    description: '収集されたサンプルツイート',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  getExampleTweets(@Body(ValidationPipe) dto: GetExampleTweetsDto): Promise<CrawledTweet[]> {
    return this.mlService.getExampleTweets(dto);
  }
}
