import { Controller, UseGuards, Post, Request, Body, ValidationPipe, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * ログイン
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  // ドキュメントの設定
  @ApiOperation({ summary: '指定されたユーザIDおよびパスワードによるログイン' })
  @ApiOkResponse({
    type: Object,
    description: 'ログインの完了',
  })
  @ApiUnauthorizedResponse({
    description: 'ユーザIDまたはパスワードの誤りによるエラー',
  })
  async login(@Body(ValidationPipe) dto: LoginDto) {
    return this.authService.login(dto);
  }
}
