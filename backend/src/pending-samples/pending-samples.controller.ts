import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PendingSamplesService } from './pending-samples.service';
import { CreatePendingSampleDto } from './dto/create-pending-sample.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/pending-samples')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PendingSamplesController {
  constructor(private readonly service: PendingSamplesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreatePendingSampleDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
