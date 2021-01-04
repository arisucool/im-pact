import { Controller, UseGuards, Post, HttpCode, Body, ValidationPipe, Get, Param, Delete, Put } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { Topic } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Controller('topics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  /**
   * トピックの作成
   */
  @Post()
  @HttpCode(200)
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
  @ApiOperation({ summary: '指定されたトピックの削除' })
  remove(@Param('id') id: number) {
    return this.topicsService.remove(id);
  }
}
