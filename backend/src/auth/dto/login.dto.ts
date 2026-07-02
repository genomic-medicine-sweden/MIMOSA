import { IsString, IsOptional, MinLength } from 'class-validator';
import {
  ApiPropertyOptional,
  ApiProperty,
  ApiHideProperty,
} from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Username (for automation account not using email)',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  grant_type?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  client_secret?: string;
}
