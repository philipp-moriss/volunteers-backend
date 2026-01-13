import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { UserRole } from 'src/shared/user/type';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserService } from '../user.service';

@ApiTags('Admin User')
@Controller('admin/user')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a new user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get all users' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAll();
  }
}
