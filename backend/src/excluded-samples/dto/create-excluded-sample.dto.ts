import { IsNotEmpty, IsString } from 'class-validator';

export class CreateExcludedSampleDto {
  @IsString()
  @IsNotEmpty()
  sample_id: string;

  @IsString()
  @IsNotEmpty()
  profile: string;
}
