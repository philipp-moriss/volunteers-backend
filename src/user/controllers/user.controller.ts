import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUserMetadata, UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { UserRole } from 'src/shared/user/type';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { GetUsersQueryDto } from '../dto/get-users-query.dto';
import { UserService } from '../user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() createUserDto: CreateUserDto,
    @GetUserMetadata() admin: UserMetadata,
  ) {
    return this.userService.create(createUserDto, admin.userId);
  }

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  findAll(@Query() query: GetUsersQueryDto) {
    return this.userService.findAll(query.status);
  }

  @ApiOperation({ summary: 'Get a user by id with role data' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOneWithRoleData(id);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a user by id' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUserMetadata() currentUser: UserMetadata,
  ) {
    return this.userService.update(id, updateUserDto, currentUser.userId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete a user by id' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id);
  }
}
