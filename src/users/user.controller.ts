import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  // @UseGuards(JwtAuthGuard) - не нужен, так как guard применяется глобально
  @Get('profile')
  async getProfile(@User() user: any) {
    const userData = await this.usersService.findById(user.id);
    if (!userData) {
      throw new NotFoundException('User not found');
    }
    // findById уже не возвращает password (использует select)
    return userData;
  }

  // @UseGuards(JwtAuthGuard) - не нужен, так как guard применяется глобально
  @Patch('me')
  async updateProfile(@User() user: any, @Body() updateDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateUser(user.id, updateDto);
    // updateUser должен использовать select без password
    return updatedUser;
  }

  // @UseGuards(JwtAuthGuard) - не нужен, так как guard применяется глобально
  @Patch('me/password')
  async changePassword(@User() user: any, @Body() changePasswordDto: ChangePasswordDto) {
    await this.usersService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword
    );
    return { message: 'Password changed successfully' };
  }
}

