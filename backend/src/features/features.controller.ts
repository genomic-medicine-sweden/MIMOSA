import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiOAuth2,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Feature } from './features.schema';
import { UpdateFeatureDto } from './dto/update-feature.dto';

@ApiTags('features')
@ApiOAuth2(['admin'])
@Controller('api/features')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all sample features',
    description: 'Returns features associated with samples in the database.',
  })
  getAllFeatures() {
    return this.featuresService.findAll();
  }

  @Get(':sample_id')
  @ApiOperation({
    summary: 'List features for a specific sample',
    description: 'Returns features associated with the given sample ID.',
  })
  getFeature(@Param('sample_id') sampleId: string) {
    return this.featuresService.findBySampleId(sampleId);
  }

  @Patch(':sample_id')
  @ApiParam({ name: 'sample_id', required: true })
  @ApiBody({ type: UpdateFeatureDto })
  @ApiOperation({
    summary: 'Update sample features',
    description:
      ' Allow PostCode, Hospital, and Date fields in the sample feature to be updated by ID.',
  })
  async updateFeature(
    @Param('sample_id') sampleId: string,
    @Body() updateDto: UpdateFeatureDto,
    @Req() req,
  ) {
    const userEmail = req.user?.email || 'unknown';
    return this.featuresService.updateBySampleId(
      sampleId,
      updateDto,
      userEmail,
    );
  }
}
