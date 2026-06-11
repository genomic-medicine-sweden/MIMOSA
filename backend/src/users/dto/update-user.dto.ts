import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class GrowthThresholdDto {
  @IsOptional()
  @IsEnum(['absolute', 'total', 'percent'])
  type?: 'absolute' | 'total' | 'percent';

  @IsOptional()
  @IsNumber()
  @Min(1)
  value?: number;
}

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

  @IsOptional()
  @IsBoolean()
  growthAlerts?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => GrowthThresholdDto)
  growthThreshold?: GrowthThresholdDto;

  @IsOptional()
  @IsEnum(['daily', 'weekly'])
  growthFrequency?: 'daily' | 'weekly';
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
