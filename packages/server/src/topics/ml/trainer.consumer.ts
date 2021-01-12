import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { MlService } from './ml.service';
import { TwitterCrawlerService } from './twitter-crawler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from './entities/crawled-tweet.entity';
import { ExtractedTweet } from './entities/extracted-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { TrainAndValidateDto } from './dto/train-and-validate.dto';

/**
 * 学習に関するキューを処理するためのコンシューマ
 */
@Processor('trainer')
export class TrainerConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

  /**
   * crawler ジョブの実行
   * (@nestjs/bull に呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'TrainerConsumer/execJob');
    const dto: TrainAndValidateDto = job.data.dto;
    try {
      const result = await this.mlService.trainAndValidate(dto);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'TrainerConsumer/execJob');
      return result;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'TrainerConsumer/execJob');
      throw e;
    }
  }
}
