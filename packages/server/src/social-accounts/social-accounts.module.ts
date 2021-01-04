import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccount } from './entities/social-account.entity';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([SocialAccount])],
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService],
})
export class SocialAccountsModule {}
