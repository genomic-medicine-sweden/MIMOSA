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
import { ExcludedGroupsService } from './excluded-groups.service';
import { CreateExcludedGroupDto } from './dto/create-excluded-group.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/excluded-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ExcludedGroupsController {
  constructor(private readonly service: ExcludedGroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateExcludedGroupDto, @Req() req: any) {
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
