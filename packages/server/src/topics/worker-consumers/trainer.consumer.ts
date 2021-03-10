import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { MlService } from '../ml/ml.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ClassifiedTweet } from '../ml/entities/classified-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { TrainAndValidateDto } from '../ml/dto/train-and-validate.dto';
import { ReTrainDto } from '../ml/dto/retrain.dto';

/**
 * トレーニング＆検証に関するキューを処理するためのコンシューマ
 */
@Processor('trainer')
export class TrainerConsumer {
  constructor(private mlService: MlService) {}

  /**
   * トレーニング＆検証のためのジョブの処理
   * (@nestjs/bull から 'trainer' キューを介して呼び出される)
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
