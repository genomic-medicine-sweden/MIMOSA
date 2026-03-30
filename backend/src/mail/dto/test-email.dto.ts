import { IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TestEmailDto {
  @ApiPropertyOptional({
    description: 'Recipient email address (leave empty to send to authenticated user)',
  })
  @IsOptional()
  @IsEmail()
  to?: string;
}
