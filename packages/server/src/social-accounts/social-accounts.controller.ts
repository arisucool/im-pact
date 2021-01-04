import { Controller, Get, HttpCode, UseGuards } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SocialAccount } from './entities/social-account.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('social-accounts')
export class SocialAccountsController {
  constructor(private socialAccountsService: SocialAccountsService) {}

  /**
   * ソーシャルアカウントの検索
   */
  @Get()
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: 'ソーシャルアカウントの検索' })
  @ApiOkResponse({
    type: SocialAccount,
    description: 'ソーシャルアカウント',
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  findAll() {
    return this.socialAccountsService.findAll();
  }
}
