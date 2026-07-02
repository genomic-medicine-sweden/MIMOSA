import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExcludedSamplesService } from './excluded-samples.service';
import { CreateExcludedSampleDto } from './dto/create-excluded-sample.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/excluded-samples')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ExcludedSamplesController {
  constructor(private readonly service: ExcludedSamplesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateExcludedSampleDto, @Req() req: any) {
    return this.service.create(dto, req.user?.email ?? 'unknown');
  }

  @Delete()
  deleteMany(@Body() body: { ids: string[] }) {
    return this.service.deleteMany(body.ids);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
