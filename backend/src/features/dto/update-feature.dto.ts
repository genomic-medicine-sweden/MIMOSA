// features/dto/update-feature.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class ManualCoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class UpdateFeatureDto {
  @ApiPropertyOptional({
    description: 'Postcode',
    example: 'SE-70364',
  })
  @IsOptional()
  @IsString()
  PostCode?: string;

  @ApiPropertyOptional({
    description: 'Hospital',
    example: 'Örebro Universitetssjukhus',
  })
  @IsOptional()
  @IsString()
  Hospital?: string;

  @ApiPropertyOptional({
    description: 'Date (YYYY-MM-DD)',
    example: '2024-09-19',
  })
  @IsOptional()
  @IsString()
  Date?: string;

  @ApiPropertyOptional({
    description:
      'Manual coordinates for map placement (fallback when postcode/hospital unavailable)',
    example: { lat: 59.33, lng: 18.07 },
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualCoordinatesDto)
  manualCoordinates?: ManualCoordinatesDto | null;
}
