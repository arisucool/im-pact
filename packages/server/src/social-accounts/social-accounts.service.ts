import { Injectable } from '@nestjs/common';
import { SocialAccount } from './entities/social-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccountsModule } from './social-accounts.module';

@Injectable()
export class SocialAccountsService {
  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountRepository: Repository<SocialAccount>,
  ) {}

  /**
   * ソーシャルアカウントの検索
   */
  async findAll(): Promise<SocialAccount[]> {
    return await this.socialAccountRepository.find();
  }
}
