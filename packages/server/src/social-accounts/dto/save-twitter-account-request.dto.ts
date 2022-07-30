import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
export class SaveTwitterAccountRequestDto {
  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  oAuthToken: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  oAuthTokenSecret: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  oAuthVerifier: string;
}
