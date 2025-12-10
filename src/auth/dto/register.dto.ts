import { IsEmail, IsString, MinLength, IsIn, IsDateString, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно для заполнения' })
  @MinLength(2, { message: 'Имя должно быть не менее 2 символов' })
  name: string;

  @IsEmail({}, { message: 'Email должен быть валидным' })
  @IsNotEmpty({ message: 'Email обязателен для заполнения' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен для заполнения' })
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Пол обязателен для заполнения' })
  @IsIn(['male', 'female', 'other'], { message: 'Пол должен быть: male, female или other' })
  gender: string;

  @IsString()
  @IsNotEmpty({ message: 'Аллергии обязательны для заполнения' })
  allergies: string;

  @IsDateString({}, { message: 'Дата рождения должна быть валидной датой' })
  @IsNotEmpty({ message: 'Дата рождения обязательна для заполнения' })
  birthDate: string;
}
  