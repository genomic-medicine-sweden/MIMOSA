import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OutbreaksService } from './outbreaks.service';

@ApiTags('outbreaks')
@Controller('api/outbreaks')
export class OutbreaksController {
  constructor(private readonly outbreaksService: OutbreaksService) {}

  @Get()
  @ApiOperation({ summary: 'Get current outbreaks' })
  async getOutbreaks(@Query('analysis_profile') analysis_profile?: string) {
    if (!analysis_profile) {
      throw new BadRequestException(
        'analysis_profile query parameter is required',
      );
    }
    return this.outbreaksService.getLatestOutbreaks(analysis_profile);
  }
}
