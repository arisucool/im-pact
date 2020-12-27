import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ログインするための情報
 */
export class LoginDto {
  @ApiProperty({
    description: 'ユーザID',
    example: 'arisu',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'パスワード',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
