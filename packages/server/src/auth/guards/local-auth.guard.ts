import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * ユーザIDおよびパスワードによる認証を行うためのガード
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
