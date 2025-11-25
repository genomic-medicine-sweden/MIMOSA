import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
  Body,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOAuth2, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserFieldsDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@ApiOAuth2(['admin'])
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user.',
  })
  async getOwnProfile(@Req() req: Request) {
    const userId = (req as any).user?.userId;
    return this.usersService.findMe(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  @ApiOperation({
    summary: 'List users',
    description: 'Lists all users.',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({
    summary: 'Create a new user account',
    description: 'Creates a new user account.',
  })
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('User with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      passwordHash,
    });

    const { passwordHash: _, __v, _id, ...rest } = user.toObject?.() ?? user;
    return rest;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':email')
  @ApiParam({
    name: 'email',
    required: true,
    description: 'Email of the user to update',
  })
  @ApiOperation({
    summary: 'Update user',
    description: 'Admins can update any user.',
  })
  async update(
    @Param('email') email: string,
    @Body() updates: UpdateUserFieldsDto,
    @Req() req: Request,
  ) {
    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const currentUser = req.user as any;
    const isAdmin = currentUser.role === 'admin';

    if (!isAdmin && currentUser.email !== email) {
      throw new BadRequestException(
        'You are only allowed to update your own account.',
      );
    }

    if (updates.role && !isAdmin) {
      throw new BadRequestException('Only admins can change user roles.');
    }

    const updatePayload: any = Object.fromEntries(
      Object.entries(updates).filter(
        ([_, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          value !== 'string',
      ),
    );

    if (
      updates.newEmail &&
      updates.newEmail.trim() !== '' &&
      updates.newEmail !== 'string'
    ) {
      const existing = await this.usersService.findByEmail(updates.newEmail);
      if (existing && existing.email !== email) {
        throw new BadRequestException('Email already in use.');
      }
      updatePayload.email = updates.newEmail;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('No valid fields provided for update.');
    }

    try {
      const user = await this.usersService.updateUserByEmail(
        email,
        updatePayload,
      );

      if (!user) {
        throw new BadRequestException('User not found or update failed.');
      }

      const { passwordHash, __v, _id, ...rest } = user.toObject?.() ?? user;
      return rest;
    } catch (err) {
      console.error(`[ERROR] Failed to update user ${email}:`, err);
      throw new BadRequestException('User update failed.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':email/password')
  @ApiParam({ name: 'email', required: true, description: 'Email of the user' })
  @ApiOperation({
    summary: 'Change user password',
    description:
      'Allows users to change their own password, or admins to reset passwords.',
  })
  async changePassword(
    @Param('email') email: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const currentUser = req.user as any;
    const isAdmin = currentUser.role === 'admin';

    if (!isAdmin && currentUser.email !== email) {
      throw new BadRequestException('You can only change your own password.');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const isSelf = currentUser.email === email;

    if (!isAdmin || (isAdmin && isSelf)) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required.');
      }
      const passwordMatches = await this.usersService.comparePassword(
        dto.currentPassword,
        user.passwordHash,
      );

      if (!passwordMatches) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.usersService.updateUserByEmail(email, {
      passwordHash,
    });

    if (!updated) {
      throw new BadRequestException('Password update failed.');
    }

    return { message: 'Password updated successfully.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':email')
  @ApiParam({
    name: 'email',
    required: true,
    description: 'Email of the user to delete',
  })
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes a user account using the provided email.',
  })
  async remove(@Param('email') email: string) {
    if (!email) throw new BadRequestException('Email parameter is required.');

    const deleted = await this.usersService.deleteUserByEmail(email);
    if (!deleted) {
      throw new BadRequestException('User not found.');
    }

    return { message: 'User deleted successfully' };
  }
}
