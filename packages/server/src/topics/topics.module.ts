import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([CrawledTweet, ExtractedTweet, SocialAccount, Topic, ModuleStorage, MlModel]),
    SocialAccountsModule,
  ],
  controllers: [TopicsController, MlController],
  providers: [MlService, TopicsService, TwitterCrawlerService],
})
export class TopicsModule {}
