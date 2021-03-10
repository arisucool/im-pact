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
import { ClassifiedTweet } from './ml/entities/classified-tweet.entity';
import { RejectTweetDto } from './dto/reject-tweet.dto';
import { AcceptTweetDto } from './dto/accept-tweet.dto';
import { CrawledTweet } from './ml/entities/crawled-tweet.entity';

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
    type: CrawledTweet,
    description: '収集結果',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  crawl(@Param('id') id: number) {
    return this.topicsService.addJobToCrawlerQueue(id);
  }

  /**
   * 指定されたトピックにおけるツイートの分類
   * @param id トピックID
   */
  @Post(':id/classify')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックにおける収集済みツイートの分類' })
  @ApiOkResponse({
    type: ClassifiedTweet,
    description: '分類結果',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  classify(@Param('id') id: number) {
    return this.topicsService.addJobToClassifierQueue(id);
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
    type: ClassifiedTweet,
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
   * 指定されたトピックにおける分類済みツイートの取得
   * @param id トピックID
   */
  @Get(':id/classifiedTweets/:predictedClass')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたトピックにおける分類済みツイートの取得' })
  @ApiOkResponse({
    type: ClassifiedTweet,
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
    name: 'lastClassifiedAt',
    type: Number,
    description: '分類日時 (ページング用であり、この値よりも収集日時の古い項目が取得される)',
    required: false,
  })
  getClassifiedTweets(
    @Param('id') id: number,
    @Param('predictedClass') predictedClass: string,
    @Query('pendingActionIndex') pendingActionIndex?: number,
    @Query('lastClassifiedAt') lastClassifiedAt?: number,
  ) {
    const lastClassifiedAtAsDate = lastClassifiedAt ? new Date(+lastClassifiedAt) : new Date();
    return this.topicsService.getClassifiedTweets(id, predictedClass, pendingActionIndex, lastClassifiedAtAsDate);
  }

  /**
   * 指定されたトピックおよびツイートに対する承認
   * @param id トピックID
   * @param classifiedTweetId 分類済みツイートのID
   */
  @Post(':id/tweets/:classifiedTweetId/accept')
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
  acceptTweet(
    @Param('id') id: number,
    @Param('classifiedTweetId') classifiedTweetId: number,
    @Body(ValidationPipe) dto: AcceptTweetDto,
  ) {
    dto.topicId = id;
    dto.classifiedTweetId = classifiedTweetId;
    return this.topicsService.acceptTweetByDto(dto);
  }

  /**
   * 指定されたトピックおよびツイートに対する拒否
   * @param id トピックID
   * @param classifiedTweetId 分類済みツイートのID
   */
  @Post(':id/tweets/:classifiedTweetId/reject')
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
  rejectTweet(
    @Param('id') id: number,
    @Param('classifiedTweetId') classifiedTweetId: number,
    @Body(ValidationPipe) dto: RejectTweetDto,
  ) {
    dto.topicId = id;
    dto.classifiedTweetId = classifiedTweetId;
    return this.topicsService.rejectTweetByDto(dto);
  }

  /**
   * 指定されたトピックおよびツイートに対する承認
   * @param id トピックID
   * @param classifiedTweetId 分類済みツイートのID
   * @param token 拒否用URLのトークン
   */
  @Get(':id/tweets/:classifiedTweetId/acceptWithAction')
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
    @Param('classifiedTweetId') classifiedTweetId: number,
    @Query('token') token: string,
  ) {
    if (token === null) {
      throw new BadRequestException('token is null');
    }
    return this.topicsService.acceptTweet(id, classifiedTweetId, token);
  }

  /**
   * 指定されたトピックおよびツイートに対するアクションの拒否
   * @param id トピックID
   * @param classifiedTweetId 分類済みツイートのID
   * @param token 拒否用URLのトークン
   */
  @Get(':id/tweets/:classifiedTweetId/rejectWithAction')
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
    @Param('classifiedTweetId') classifiedTweetId: number,
    @Query('token') token: string,
  ) {
    return this.topicsService.rejectTweet(id, classifiedTweetId, token);
  }
}
