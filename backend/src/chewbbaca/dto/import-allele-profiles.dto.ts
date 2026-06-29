import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SampleDto {
  @IsString()
  @IsNotEmpty()
  sample_id!: string;

  @IsObject()
  alleles!: Record<string, string>;

  @IsOptional()
  @IsIn(['replace'])
  action?: 'replace';

  @IsOptional()
  @IsString()
  filename?: string;
}

export class ImportAlleleProfilesDto {
  @IsString()
  @IsNotEmpty()
  analysis_profile!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SampleDto)
  samples!: SampleDto[];
}

export class UpdateSampleIdDto {
  @IsString()
  @IsNotEmpty()
  sample_id!: string;
}
