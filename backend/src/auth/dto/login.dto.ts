import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'MIMOSA@example.com',
    description: 'email',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: 'MIMOSApassword',
    description: 'password',
  })
  @IsString()
  password: string;
}
