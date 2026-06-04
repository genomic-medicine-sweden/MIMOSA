import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class UpdatePendingSampleDto {
  @IsString()
  @IsNotEmpty()
  expectedId: string;

  @IsOptional()
  @IsString()
  postCode?: string;

  @IsOptional()
  @IsString()
  hospital?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualCoordinatesDto)
  manualCoordinates?: ManualCoordinatesDto | null;
}
