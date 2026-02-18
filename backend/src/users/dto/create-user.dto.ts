import { IsEmail, IsString, IsIn, IsOptional } from 'class-validator';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  homeCounty?: string;

  @ApiProperty({
    enum: ['admin', 'user'],
    default: 'user',
    required: false,
  })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';

  @ApiProperty()
  @IsString()
  password: string;
}
