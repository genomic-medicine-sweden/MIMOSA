import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOAuth2, ApiOperation } from '@nestjs/swagger';
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
    description: 'Returns most recent clustering results.',
  })
  getAll() {
    return this.clusteringService.findAll();
  }
}
