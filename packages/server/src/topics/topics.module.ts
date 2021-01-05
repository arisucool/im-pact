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

@Module({
  imports: [TypeOrmModule.forFeature([CrawledTweet, ExtractedTweet, SocialAccount, Topic]), SocialAccountsModule],
  controllers: [TopicsController, MlController],
  providers: [MlService, TopicsService],
})
export class TopicsModule {}
