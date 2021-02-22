import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MlService } from './ml/ml.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawledTweet } from './ml/entities/crawled-tweet.entity';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Topic } from './entities/topic.entity';
import { ExtractedTweet } from './ml/entities/extracted-tweet.entity';
import { ModuleStorage } from './ml/entities/module-storage.entity';
import { TwitterCrawlerService } from './ml/twitter-crawler.service';
import { MlModel } from './ml/entities/ml-model.entity';
import { ActionConsumer } from './worker-consumers/action.consumer';
import { CrawlerConsumer } from './worker-consumers/crawler.consumer';
import { TrainerConsumer } from './worker-consumers/trainer.consumer';
import { RetrainerConsumer } from './worker-consumers/retrainer.consumer';
import { CleanerConsumer } from './worker-consumers/cleaner.consumer';
import { TweetFilterService } from './ml/tweet-filter.service';

/**
 * トピックに関するキュー処理のためのモジュール
 * (../worker-app.module.ts から呼び出される)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CrawledTweet, ExtractedTweet, SocialAccount, Topic, ModuleStorage, MlModel]),
    // キューを登録
    BullModule.registerQueue({
      name: 'action', // ./worker-consumers/action.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'cleaner', // ./worker-consumers/cleaner.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'crawler', // ./worker-consumers/crawler.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'trainer', // ./worker-consumers/trainer.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'retrainer', // ./worker-consumers/retrainer.consumer.ts にて処理される
    }),
  ],
  controllers: [],
  providers: [
    // 各 Consumer から使用されるサービス
    MlService,
    TwitterCrawlerService,
    TweetFilterService,
    // キューを処理するための Consumer
    ActionConsumer,
    CleanerConsumer,
    CrawlerConsumer,
    TrainerConsumer,
    RetrainerConsumer,
  ],
})
export class TopicsWorkerModule {}
