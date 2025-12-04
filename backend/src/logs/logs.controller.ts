import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOAuth2, ApiOperation } from '@nestjs/swagger';

@ApiTags('logs')
@ApiOAuth2(['admin'])
@Controller('api/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve all sample logs',
    description: 'Returns all sample logs.',
  })
  getAllLogs() {
    return this.logsService.findAll();
  }

  @Get(':sample_id')
  @ApiOperation({
    summary: 'Retrieve logs for a specific sample',
    description: 'Returns logs associated with the given sample ID.',
  })
  getLogBySampleId(@Param('sample_id') sampleId: string) {
    return this.logsService.findBySampleId(sampleId);
  }
}
