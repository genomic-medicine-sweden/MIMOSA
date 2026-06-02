import { Controller, Get } from '@nestjs/common';
import { MapConfigService } from './map-config.service';

@Controller('api/map-config')
export class MapConfigController {
  constructor(private readonly mapConfigService: MapConfigService) {}

  @Get()
  getMapConfig() {
    return this.mapConfigService.getConfig();
  }

  @Get('coordinates')
  getCoordinates() {
    return this.mapConfigService.getCoordinates();
  }

  @Get('boundaries')
  getBoundaries() {
    return this.mapConfigService.getBoundaries();
  }
}
