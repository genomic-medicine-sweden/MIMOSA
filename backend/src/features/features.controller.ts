import {
  Controller,
  Get,
  Patch,
  Delete,
  HttpCode,
  Param,
  Body,
  UseGuards,
  Req,
  Sse,
} from '@nestjs/common';
import { Observable, merge, interval } from 'rxjs';
import { fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { UpdateFeatureDto } from './dto/update-feature.dto';

@ApiTags('features')
@ApiOAuth2(['admin'])
@Controller('api/features')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FeaturesController {
  constructor(
    private readonly featuresService: FeaturesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all sample features',
    description: 'Returns features associated with samples in the database.',
  })
  getAllFeatures() {
    return this.featuresService.findAll();
  }

  @Sse('events')
  @ApiOperation({
    summary: 'SSE stream for feature change notifications',
    description:
      'Streams a notification whenever a feature is inserted or updated.',
  })
  featureEvents(): Observable<MessageEvent> {
    const events$ = fromEvent(this.eventEmitter, 'features.changed').pipe(
      map(() => ({ data: { type: 'features.changed' } }) as MessageEvent),
    );
    const ping$ = interval(30_000).pipe(
      map(() => ({ data: { type: 'ping' } }) as MessageEvent),
    );
    return merge(events$, ping$);
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
      'Allow PostCode, Hospital, and Date fields in the sample feature to be updated by ID.',
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

  @Delete(':sample_id')
  @HttpCode(204)
  @ApiParam({ name: 'sample_id', required: true })
  @ApiOperation({
    summary: 'Delete a sample',
    description:
      'Removes the sample feature and all associated allele profiles. Deletion is logged.',
  })
  async deleteFeature(
    @Param('sample_id') sampleId: string,
    @Req() req,
  ): Promise<void> {
    const userEmail = req.user?.email || 'unknown';
    await this.featuresService.deleteBySampleId(sampleId, userEmail);
  }
}
