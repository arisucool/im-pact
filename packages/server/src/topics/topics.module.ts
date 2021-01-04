import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccountsModule } from 'src/social-accounts/social-accounts.module';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Topic } from './entities/topic.entity';
import { TopicsService } from './topics.service';

@Module({
  imports: [TypeOrmModule.forFeature([SocialAccount, Topic]), SocialAccountsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
