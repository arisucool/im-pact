import { Controller, UseGuards, Post, HttpCode, Body, ValidationPipe, Get } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import { MlService } from './ml.service';
import { CrawledTweet } from './entities/crawled-tweets.entity';

@Controller('ml')
export class MlController {
  constructor(private mlService: MlService) {}

  /**
   * 学習用サンプルツイートの収集・取得
   */
  //@UseGuards(LocalAuthGuard)
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
  async getExampleTweets(@Body(ValidationPipe) dto: GetExampleTweetsDto): Promise<CrawledTweet[]> {
    return await this.mlService.getExampleTweets(dto);
  }
}
