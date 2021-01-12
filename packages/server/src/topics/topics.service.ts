import { Injectable, BadRequestException } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Topic } from './entities/topic.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectQueue('crawler')
    private readonly crawlQueue: Queue,
  ) {}

  /**
   * トピックの作成
   * @param dto トピックを作成するための情報
   */
  async create(dto: CreateTopicDto): Promise<Topic> {
    const topic = new Topic();
    topic.name = dto.name;
    topic.keywords = dto.keywords;
    topic.crawlSocialAccount = new SocialAccount();
    topic.crawlSocialAccount.id = dto.crawlSocialAccountId;
    topic.crawlSchedule = dto.crawlSchedule;
    topic.filterPatterns = dto.filterPatterns;
    topic.enabledFilterPatternIndex = dto.enabledFilterPatternIndex;
    topic.actions = dto.actions;
    topic.trainingTweets = dto.trainingTweets;
    return await this.topicsRepository.save(topic);
  }

  /**
   * 全てのトピックの取得
   */
  async findAll() {
    return await this.topicsRepository.find();
  }

  /**
   * 指定されたトピックの取得
   * @param id トピックID
   */
  async findOne(id: number) {
    const item: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
      //loadRelationIds: true,
    });
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    return item;
  }

  /**
   * 指定されたトピックIDの更新
   * @param id トピックID
   * @param dto
   */
  async update(id: number, dto: UpdateTopicDto) {
    const item: Topic = await this.topicsRepository.findOne(id);
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    let updated = Object.assign(item, dto);
    return await this.topicsRepository.save(updated);
  }

  /**
   * 指定されたトピックの削除
   * @param id トピックID
   */
  async remove(id: number) {
    const item: Topic = await this.topicsRepository.findOne(id);
    if (item === undefined) {
      throw new BadRequestException('Invalid item');
    }
    item.remove();
  }

  /**
   * 指定されたトピックにおけるツイートの収集 (キューに対するジョブ追加)
   * @param id トピックID
   */
  async addCrawlerQueue(id: number): Promise<string> {
    // crawler キューへジョブを追加
    // (crawler.consumer.ts にて順次処理される)
    const job = await this.crawlQueue.add({
      topicId: id,
    });

    // ジョブIDを返す
    return job.id.toString();
  }
}
