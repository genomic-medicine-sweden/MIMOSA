// features/dto/update-feature.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureDto {
  @ApiPropertyOptional({
    description: 'Postocde',
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
}
