import { Body, Controller, Get, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@User() user: any) {
    const userData = await this.usersService.findById(user.id);
    if (!userData) {
      throw new NotFoundException('User not found');
    }
    // Убираем пароль из ответа
    const { password, ...userWithoutPassword } = userData;
    return userWithoutPassword;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@User() user: any, @Body() updateDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateUser(user.id, updateDto);
    // Убираем пароль из ответа
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  @UseGuards(JwtAuthGuard)
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

