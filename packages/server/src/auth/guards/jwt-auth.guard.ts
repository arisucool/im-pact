import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT(アクセストークン)による認証を行うためのガード
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
