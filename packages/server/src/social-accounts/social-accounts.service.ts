import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SocialAccount } from './entities/social-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccountsModule } from './social-accounts.module';
import * as OAuth from 'oauth';
import { SaveTwitterAccountRequestDto } from './dto/save-twitter-account-request.dto';
import Twitter = require('twitter');

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

  /**
   * Twitter 認証ページURLの取得
   * @param callbackUrl コールバックURL
   * @returns Twitter 認証ページURL
   */
  async getTwitterAuthUrl(callbackUrl: string): Promise<{ authUrl: string; oAuthTokenSecret: string }> {
    return new Promise((resolve, reject) => {
      const oAuth = this.getTwitterOAuth(callbackUrl);
      oAuth.getOAuthRequestToken((error, oAuthToken, oAuthTokenSecret) => {
        if (error) {
          return reject(JSON.stringify(error));
        }

        const authUrl = 'https://twitter.com/oauth/authenticate?oauth_token=' + oAuthToken;
        resolve({
          authUrl: authUrl,
          oAuthTokenSecret: oAuthTokenSecret,
        });
      });
    });
  }

  /**
   * Twitter アクセストークンの保存
   */
  async saveTwitterAccount(dto: SaveTwitterAccountRequestDto): Promise<SocialAccount> {
    const response = await this.getTwitterOAuthAccessToken(dto.oAuthToken, dto.oAuthTokenSecret, dto.oAuthVerifier);
    const accessToken = response.accessToken;
    const accessTokenSecret = response.accessTokenSecret;
    const screenName = response.screenName;

    // Twitter クライアントを初期化
    if (!process.env.TWITTER_CONSUMER_KEY)
      throw new Error('TWITTER_CONSUMER_KEY is not specfied in the environment variable.');
    if (!process.env.TWITTER_CONSUMER_SECRET)
      throw new Error('TWITTER_CONSUMER_SECRET is not specfied in the environment variable.');
    const twitterClient = new Twitter({
      access_token_key: accessToken,
      access_token_secret: accessTokenSecret,
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    });

    return this.socialAccountRepository.save({
      type: 'twitter',
      accessToken: accessToken,
      accessTokenSecret: accessTokenSecret,
      displayName: screenName,
    });
  }

  private async getTwitterOAuthAccessToken(
    oauthToken: string,
    oAuthTokenSecret: string,
    oAuthVerifier: string,
  ): Promise<{ accessToken: string; accessTokenSecret: string; screenName: string; userId: string }> {
    return new Promise((resolve, reject) => {
      const oAuth = this.getTwitterOAuth();
      oAuth.getOAuthAccessToken(
        oauthToken,
        oAuthTokenSecret,
        oAuthVerifier,
        (error, oAuthAccessToken, oAuthAccessTokenSecret, results) => {
          if (error) {
            return reject(JSON.stringify(error));
          }

          resolve({
            accessToken: oAuthAccessToken,
            accessTokenSecret: oAuthAccessTokenSecret,
            screenName: results.screen_name,
            userId: results.user_id,
          });
        },
      );
    });
  }

  private getTwitterOAuth(callbackUrl?: string): any {
    return new OAuth.OAuth(
      'https://twitter.com/oauth/request_token',
      'https://twitter.com/oauth/access_token',
      process.env.TWITTER_CONSUMER_KEY,
      process.env.TWITTER_CONSUMER_SECRET,
      '1.0A',
      callbackUrl,
      'HMAC-SHA1',
    );
  }
}
