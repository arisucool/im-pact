import { ApiProperty } from '@nestjs/swagger';
export class GetAuthURlResponse {
  @ApiProperty()
  authUrl: string;

  @ApiProperty()
  oAuthTokenSecret: string;
}
