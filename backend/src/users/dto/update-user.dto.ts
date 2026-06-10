import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsEnum,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  outbreakAlerts?: boolean;

  @IsOptional()
  @IsEnum(['immediate', 'daily', 'weekly'])
  frequency?: 'immediate' | 'daily' | 'weekly';

  @IsOptional()
  @IsObject()
  alertThreshold?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  pipelineFailureAlerts?: boolean;
}
export class UpdateUserFieldsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  newEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homeCounty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
