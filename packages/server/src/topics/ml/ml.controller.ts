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
import { CrawlExampleTweetsDto } from './dto/crawl-example-tweets.dto';
import { MlService } from './ml.service';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';
import { JobStatus } from './job-status.interface';
import { TweetFilterService } from './tweet-filter.service';
import { TwitterCrawlerService } from './twitter-crawler.service';

@Controller('ml')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MlController {
  constructor(
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
    private tweetFilterService: TweetFilterService,
    // 学習に関する処理を行うためのキュー
    @InjectQueue('trainer')
    private readonly trainerQueue: Queue,
    // ツイートの収集に関する処理を行うためのキュー
    @InjectQueue('crawler')
    private readonly crawlerQueue: Queue,
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
   * 学習用サンプルツイートの収集
   */
  @Post('crawlExampleTweets')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '学習用サンプルツイートの収集' })
  @ApiOkResponse({
    type: Object,
    description: 'ジョブID',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async crawlExampleTweets(@Body(ValidationPipe) dto: CrawlExampleTweetsDto): Promise<number> {
    // crawler キューへジョブを追加
    const job = await this.crawlerQueue.add({
      dto: dto,
    });

    // ジョブIDを返す
    return parseInt(job.id.toString());
  }

  /**
   * 学習用サンプルツイートの収集・取得に対するジョブステータスの取得
   */
  @Get('crawlExampleTweets/:jobId')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '学習用サンプルツイートの収集に対するジョブステータスの取得' })
  @ApiOkResponse({
    type: Object,
    description: 'ジョブのステータス',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async getStatusOfCrawlExampleTweets(@Param('jobId') jobId: number): Promise<JobStatus> {
    // crawler キューから当該ジョブを取得
    const job = await this.crawlerQueue.getJob(jobId);
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
   * 学習用サンプルツイート(収集済み)の取得
   */
  @Post('getExampleTweets')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '学習用サンプルツイートの収集・取得に対するジョブステータスの取得' })
  @ApiOkResponse({
    type: CrawledTweet,
    description: '収集された学習用サンプルツイート',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async getExampleTweets(@Body(ValidationPipe) dto: CrawlExampleTweetsDto): Promise<CrawledTweet[]> {
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
    return this.tweetFilterService.getAvailableTweetFilters();
  }

  /**
   * 利用可能なアクションの取得
   */
  @Get('availableActions')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '利用可能なアクションの取得' })
  @ApiOkResponse({
    type: Object,
    description: 'アクションの連想配列',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  getAvailableActions() {
    return this.mlService.getAvailableActions();
  }
}
