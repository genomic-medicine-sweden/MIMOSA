import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DistanceService } from './distance.service';
import { DistanceDto } from './dto/distance.dto';

@Controller('api/distance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DistanceController {
  constructor(private readonly service: DistanceService) {}

  @Get(':analysis_profile')
  async get(@Param('analysis_profile') analysis_profile: string) {
    return this.service.get(analysis_profile);
  }

  @Post(':analysis_profile')
  async store(
    @Param('analysis_profile') analysis_profile: string,
    @Body() dto: DistanceDto,
  ) {
    return this.service.store(analysis_profile, dto);
  }
}
