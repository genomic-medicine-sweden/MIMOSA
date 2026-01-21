import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOAuth2, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClusteringService } from './clustering.service';

@ApiTags('clustering')
@ApiOAuth2(['admin'])
@Controller('api/clustering')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ClusteringController {
  constructor(private readonly clusteringService: ClusteringService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve clustering results',
    description:
      'Returns the latest clustering results. If analysis_profile is provided, returns the latest clustering for that profile.',
  })
  @ApiQuery({
    name: 'analysis_profile',
    required: false,
    type: String,
    description: 'Analysis profile',
  })
  getAll(@Query('analysis_profile') analysisProfile?: string) {
    if (analysisProfile) {
      return this.clusteringService.findLatestByProfile(analysisProfile);
    }

    return this.clusteringService.findAll();
  }
}
