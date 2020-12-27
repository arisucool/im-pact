import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ユーザを作成するための情報
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'ユーザID',
    type: String,
  })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'パスワード',
    type: String,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @IsNotEmpty()
  password: string;
}
