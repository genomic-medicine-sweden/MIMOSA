import { IsEmail, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  homeCounty: string;

  @ApiProperty({ enum: ['admin', 'user'], default: 'user' })
  @IsIn(['admin', 'user'])
  role: 'admin' | 'user';

  @ApiProperty()
  @IsString()
  password: string;
}
