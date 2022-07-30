import { Controller, Get, Post, Body, Param, Delete, UseGuards, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * ユーザの作成
   * @param createUserDto ユーザを作成するための情報
   */
  @Post()
  @ApiOperation({ summary: 'ユーザの作成' })
  create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * ユーザの検索
   */
  @Get()
  @ApiOperation({ summary: 'ユーザの検索' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * 指定されたユーザの取得
   * @param id ユーザID
   */
  @Get(':id')
  @ApiOperation({ summary: '指定されたユーザの取得' })
  @ApiOkResponse({
    type: User,
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * 指定されたユーザの削除
   * @param id ユーザID
   */
  @Delete(':id')
  @ApiOperation({ summary: '指定されたユーザの削除' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
