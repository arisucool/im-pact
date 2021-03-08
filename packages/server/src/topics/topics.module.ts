import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TopicsController } from './topics.controller';
import { MlController } from './ml/ml.controller';
import { MlService } from './ml/ml.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawledTweet } from './ml/entities/crawled-tweet.entity';
import { SocialAccountsModule } from 'src/social-accounts/social-accounts.module';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Topic } from './entities/topic.entity';
import { TopicsService } from './topics.service';
import { ClassifiedTweet } from './ml/entities/classified-tweet.entity';
import { ModuleStorage } from './ml/entities/module-storage.entity';
import { TwitterCrawlerService } from './ml/twitter-crawler.service';
import { MlModel } from './ml/entities/ml-model.entity';
import { TweetFilterService } from './ml/tweet-filter.service';

// 自動クリーンアップ - 完了またはエラーにより終了したジョブを残す数
// (この数を超えた古いジョブは削除される)
const AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT = 2;
const AUTO_CLEANUP_NUM_OF_FINISHED_TRAINER_QUEUE_JOBS_LEFT = 1;

/**
 * トピックに関する WebAPI を構築するためのモジュール
 * (../app.module.ts から呼び出される)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CrawledTweet, ClassifiedTweet, SocialAccount, Topic, ModuleStorage, MlModel]),
    SocialAccountsModule,
    // キューを登録
    // (但し、キューの処理は、別アプリケーション (../worker-app.module.ts) にて行われる)
    BullModule.registerQueue({
      name: 'action',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
      },
    }),
    BullModule.registerQueue({
      name: 'classifier',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
      },
    }),
    BullModule.registerQueue({
      name: 'cleaner',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
      },
    }),
    BullModule.registerQueue({
      name: 'crawler',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
      },
    }),
    BullModule.registerQueue({
      name: 'trainer',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_TRAINER_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_TRAINER_QUEUE_JOBS_LEFT,
      },
    }),
    BullModule.registerQueue({
      name: 'retrainer',
      defaultJobOptions: {
        removeOnComplete: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
        removeOnFail: AUTO_CLEANUP_NUM_OF_FINISHED_QUEUE_JOBS_LEFT,
      },
    }),
  ],
  controllers: [TopicsController, MlController],
  providers: [MlService, TopicsService, TwitterCrawlerService, TweetFilterService],
})
export class TopicsModule {}
