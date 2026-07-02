import { IsNotEmpty, IsString } from 'class-validator';

export class CreateExcludedGroupDto {
  @IsString()
  @IsNotEmpty()
  group_id: string;
}
