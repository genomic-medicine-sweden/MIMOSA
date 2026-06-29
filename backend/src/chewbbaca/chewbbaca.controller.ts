import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChewbbacaService, PROFILES } from './chewbbaca.service';
import {
  ImportAlleleProfilesDto,
  UpdateSampleIdDto,
} from './dto/import-allele-profiles.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/chewbbaca')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ChewbbacaController {
  constructor(private readonly service: ChewbbacaService) {}

  @Get('profiles')
  getProfiles() {
    return PROFILES;
  }

  @Get('allele-profiles')
  list(@Query('analysis_profile') analysis_profile?: string) {
    return this.service.listAlleleProfiles(analysis_profile);
  }

  @Post('import')
  importProfiles(@Body() dto: ImportAlleleProfilesDto) {
    return this.service.importProfiles(dto);
  }

  @Patch('allele-profiles/:id')
  updateSampleId(@Param('id') id: string, @Body() dto: UpdateSampleIdDto) {
    return this.service.updateSampleId(id, dto);
  }

  @Delete('allele-profiles/:id')
  deleteAlleleProfile(@Param('id') id: string) {
    return this.service.deleteAlleleProfile(id);
  }

  @Get('pending-for-run')
  getPendingSamples() {
    return this.service.getPendingSamples();
  }
}
