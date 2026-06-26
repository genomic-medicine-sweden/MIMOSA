import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineAlertDto {
  @ApiProperty({ description: 'Error messages from the pipeline run' })
  @IsArray()
  @IsString({ each: true })
  errors: string[];

  @ApiProperty({ description: 'Profiles that were processed' })
  @IsArray()
  @IsString({ each: true })
  profiles: string[];

  @ApiPropertyOptional({
    description:
      'Recipient email. If omitted, sends to all users with pipeline failure alerts enabled.',
  })
  @IsOptional()
  @IsEmail()
  recipient?: string;
}
