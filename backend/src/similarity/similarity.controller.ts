import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOAuth2, ApiOperation } from '@nestjs/swagger';
import { SimilarityService } from './similarity.service';

@ApiTags('similarity')
@ApiOAuth2(['admin'])
@Controller('api/similarity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SimilarityController {
  constructor(private readonly similarityService: SimilarityService) {}

  @Get()
  @ApiOperation({
    summary: 'Get similar samples',
    description: 'Return similarity results for samples in the database.',
  })
  async getAll() {
    return this.similarityService.findAll();
  }
}
