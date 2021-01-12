import {
  Controller,
  UseGuards,
  Post,
  HttpCode,
  Body,
  ValidationPipe,
  Get,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { GetExampleTweetsDto } from './dto/get-example-tweets.dto';
import { MlService } from './ml.service';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { TwitterCrawlerService } from './twitter-crawler.service';
import { JobStatus } from './job-status.interface';

@Controller('ml')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MlController {
  constructor(
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
    // 学習に関する処理を行うためのキュー
    @InjectQueue('trainer')
    private readonly trainerQueue: Queue,
  ) {}

  /**
   * 指定されたお手本分類結果とフィルタ設定による学習および学習結果の検証
   */
  @Post('trainAndValidate')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたお手本分類結果とフィルタ設定による学習および学習結果の検証' })
  @ApiOkResponse({
    type: Object,
    description: 'ジョブID',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async trainAndValidate(@Body(ValidationPipe) dto: TrainAndValidateDto): Promise<number> {
    // trainer キューへジョブを追加
    const job = await this.trainerQueue.add({
      dto: dto,
    });

    // ジョブIDを返す
    return parseInt(job.id.toString());
    /*try {
      return await this.mlService.trainAndValidate(dto);
    } catch (e) {
      console.warn(e.stack);
      throw new BadRequestException(e.toString());
    }*/
  }

  /**
   * 学習および学習結果の検証に対するジョブステータスの取得
   */
  @Get('trainAndValidate/:jobId')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '学習および学習結果の検証に対するジョブステータスの取得' })
  @ApiOkResponse({
    type: Object,
    description: 'ジョブのステータス',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async getStatusOfTrainAndValidate(@Param('jobId') jobId: number): Promise<JobStatus> {
    // trainer キューから当該ジョブを取得
    const job = await this.trainerQueue.getJob(jobId);
    if (!job) throw new BadRequestException('Invalid item');

    // ステータスを返す
    return {
      status: await job.getState(),
      progress: job.progress(),
      result: job.returnvalue,
      errorMessage: job.failedReason,
      errorStacktraces: job.stacktrace,
    };
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
    return this.twitterCrawlerService.getExampleTweets(dto);
  }

  /**
   * 利用可能なツイートフィルタの取得
   */
  @Get('availableTweetFilters')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '利用可能なツイートフィルタの取得' })
  @ApiOkResponse({
    type: Object,
    description: 'ツイートフィルタの連想配列',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  getAvailableTweetFilters() {
    return this.mlService.getAvailableTweetFilters();
  }
}
