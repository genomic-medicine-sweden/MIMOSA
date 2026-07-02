import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExcludedSampleDto {
  @IsString()
  @IsNotEmpty()
  sample_id: string;

  @IsOptional()
  @IsString()
  profile?: string;
}
