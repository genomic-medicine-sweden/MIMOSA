import { IsArray, IsString } from 'class-validator';

export class DistanceDto {
  @IsArray()
  samples: string[];

  @IsArray()
  matrix: number[][];

  @IsString()
  newick: string;
}
