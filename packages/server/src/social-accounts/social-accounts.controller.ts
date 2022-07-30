import {
  Body,
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SocialAccount } from './entities/social-account.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import { GetAuthURlResponse as GetAuthUrlResponse } from './dto/get-auth-url-response.dto';
import { SaveTwitterAccountRequestDto } from './dto/save-twitter-account-request.dto';

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  findAll(): Promise<SocialAccount[]> {
    return this.socialAccountsService.findAll();
  }

  /**
   * ソーシャルアカウントの認証 (Twitter の認証ページURLを返す)
   */
  @Get('auth-url/twitter')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: 'ソーシャルアカウントの認証' })
  @ApiOkResponse({
    type: GetAuthUrlResponse,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async getAuthUrlForTwitter(): Promise<GetAuthUrlResponse> {
    try {
      return await this.socialAccountsService.getTwitterAuthUrl(
        `${process.env.BASE_URL}/social-accounts/auth-callback/twitter`,
      );
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  /**
   * ソーシャルアカウントの保存 (Twitter の認証ページからリダイレクトされたときの処理)
   */
  @Post('save/twitter')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: 'ソーシャルアカウントの保存' })
  @ApiOkResponse({
    type: SocialAccount,
  })
  @ApiUnauthorizedResponse({
    description: '権限のエラー',
  })
  async saveTwitterAccount(@Body(ValidationPipe) dto: SaveTwitterAccountRequestDto): Promise<SocialAccount> {
    try {
      return await this.socialAccountsService.saveTwitterAccount(dto);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }
}
