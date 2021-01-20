import {
  Controller,
  UseGuards,
  Post,
  HttpCode,
  Body,
  ValidationPipe,
  Get,
  Param,
  Delete,
  Put,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { Topic } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ExtractedTweet } from './ml/entities/extracted-tweet.entity';

@Controller('topics')
@ApiBearerAuth()
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  /**
   * トピックの作成
   */
  @Post()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: 'トピックの作成' })
  @ApiOkResponse({
    type: Topic,
    description: '作成されたトピック',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  create(@Body(ValidationPipe) dto: CreateTopicDto): Promise<Topic> {
    return this.topicsService.create(dto);
  }

  /**
   * トピックの検索
   */
  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: 'トピックの検索' })
  @ApiOkResponse({
    type: Topic,
    description: 'トピック',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  findAll() {
    return this.topicsService.findAll();
  }

  /**
   * 指定されたトピックの取得
   * @param id トピックID
   */
  @Get(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックの取得' })
  @ApiOkResponse({
    type: Topic,
    description: '指定されたトピック',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  findOne(@Param('id') id: number) {
    return this.topicsService.findOne(id);
  }

  /**
   * 指定されたトピックの更新
   * @param id トピックID
   */
  @Put(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックの取得' })
  @ApiOkResponse({
    type: Topic,
    description: '指定されたトピック',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  update(@Param('id') id: number, @Body(ValidationPipe) dto: UpdateTopicDto) {
    return this.topicsService.update(id, dto);
  }

  /**
   * 指定されたトピックの削除
   * @param id トピックID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '指定されたトピックの削除' })
  remove(@Param('id') id: number) {
    return this.topicsService.remove(id);
  }

  /**
   * 指定されたトピックにおけるツイートの収集
   * @param id トピックID
   */
  @Post(':id/crawl')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックにおけるツイートの収集' })
  @ApiOkResponse({
    type: ExtractedTweet,
    description: 'ログ',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  crawl(@Param('id') id: number) {
    return this.topicsService.addJobToCrawlerQueue(id);
  }

  /**
   * 指定されたトピックにおけるアクションの実行
   * @param id トピックID
   */
  @Post(':id/execActions')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックにおけるアクションの実行' })
  @ApiOkResponse({
    type: ExtractedTweet,
    description: 'ログ',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  execActions(@Param('id') id: number) {
    return this.topicsService.addJobToActionQueue(id);
  }

  /**
   * 指定されたトピックにおける抽出済みツイートの取得
   * @param id トピックID
   */
  @Get(':id/extractedTweets/:predictedClass')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックにおける抽出済みツイートの取得' })
  @ApiOkResponse({
    type: ExtractedTweet,
    description: '該当ツイートの配列',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  @ApiQuery({
    name: 'pendingActionIndex',
    type: Number,
    description: 'アクション番号 (フィルタ用)',
    required: false,
  })
  @ApiQuery({
    name: 'lastExtractedAt',
    type: Number,
    description: '抽出日時 (ページング用であり、この値よりも収集日時の古い項目が取得される)',
    required: false,
  })
  getExtractedTweets(
    @Param('id') id: number,
    @Param('predictedClass') predictedClass: string,
    @Query('pendingActionIndex') pendingActionIndex?: number,
    @Query('lastExtractedAt') lastExtractedAt?: number,
  ) {
    const lastExtractedAtAsDate = lastExtractedAt ? new Date(+lastExtractedAt) : new Date();
    return this.topicsService.getExtractedTweets(id, predictedClass, pendingActionIndex, lastExtractedAtAsDate);
  }

  /**
   * 指定されたトピックおよびツイートに対する承認
   * @param id トピックID
   * @param extractedTweetId 抽出済みツイートのID
   */
  @Post(':id/tweets/:extractedTweetId/accept')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたツイートの承認' })
  @ApiOkResponse({
    type: Topic,
    description: '承認されたツイート',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  @ApiQuery({
    name: 'actionIndex',
    description:
      'アクション番号 (-1ならば最初のアクションから実行される。未指定ならば現在の次のアクションから実行される。)',
    required: false,
  })
  acceptTweet(
    @Param('id') id: number,
    @Param('extractedTweetId') extractedTweetId: number,
    @Query('actionIndex') actionIndex?: number,
  ) {
    return this.topicsService.acceptTweet(id, extractedTweetId, null, actionIndex);
  }

  /**
   * 指定されたトピックおよびツイートに対する拒否
   * @param id トピックID
   * @param extractedTweetId 抽出済みツイートのID
   */
  @Post(':id/tweets/:extractedTweetId/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたツイートの拒否' })
  @ApiOkResponse({
    type: Topic,
    description: '拒否されたツイート',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  rejectTweet(@Param('id') id: number, @Param('extractedTweetId') extractedTweetId: number) {
    return this.topicsService.rejectTweet(id, extractedTweetId, null);
  }

  /**
   * 指定されたトピックおよびツイートに対する承認
   * @param id トピックID
   * @param extractedTweetId 抽出済みツイートのID
   * @param token 拒否用URLのトークン
   */
  @Get(':id/tweets/:extractedTweetId/acceptWithAction')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定された承認用URLによるアクションの承認' })
  @ApiOkResponse({
    type: Topic,
    description: '承認されたツイート',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  acceptTweetWithAction(
    @Param('id') id: number,
    @Param('extractedTweetId') extractedTweetId: number,
    @Query('token') token: string,
  ) {
    if (token === null) {
      throw new BadRequestException('token is null');
    }
    return this.topicsService.acceptTweet(id, extractedTweetId, token);
  }

  /**
   * 指定されたトピックおよびツイートに対するアクションの拒否
   * @param id トピックID
   * @param extractedTweetId 抽出済みツイートのID
   * @param token 拒否用URLのトークン
   */
  @Get(':id/tweets/:extractedTweetId/rejectWithAction')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定された拒否用URLによるアクションの拒否' })
  @ApiOkResponse({
    type: Topic,
    description: '拒否されたツイート',
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  rejectTweetWithAction(
    @Param('id') id: number,
    @Param('extractedTweetId') extractedTweetId: number,
    @Query('token') token: string,
  ) {
    return this.topicsService.rejectTweet(id, extractedTweetId, token);
  }
}
