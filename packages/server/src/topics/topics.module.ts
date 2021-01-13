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
import { ExtractedTweet } from './ml/entities/extracted-tweet.entity';
import { ModuleStorage } from './ml/entities/module-storage.entity';
import { TwitterCrawlerService } from './ml/twitter-crawler.service';
import { MlModel } from './ml/entities/ml-model.entity';
import { ActionConsumer } from './ml/action.consumer';
import { CrawlerConsumer } from './ml/crawler.consumer';
import { TrainerConsumer } from './ml/trainer.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrawledTweet, ExtractedTweet, SocialAccount, Topic, ModuleStorage, MlModel]),
    SocialAccountsModule,
    // キューを登録
    BullModule.registerQueue({
      name: 'action', // action.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'crawler', // crawler.consumer.ts にて処理される
    }),
    BullModule.registerQueue({
      name: 'trainer', // trainer.consumer.ts にて処理される
    }),
  ],
  controllers: [TopicsController, MlController],
  providers: [MlService, TopicsService, TwitterCrawlerService, ActionConsumer, CrawlerConsumer, TrainerConsumer],
})
export class TopicsModule {}
