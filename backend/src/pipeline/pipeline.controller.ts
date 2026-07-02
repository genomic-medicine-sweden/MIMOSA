import {
  Body,
  ConflictException,
  Controller,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsArray, IsOptional, IsString } from 'class-validator';
import {
  ApiTags,
  ApiOAuth2,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LogsService } from '../logs/logs.service';

class TriggerDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profiles?: string[];
}

@ApiTags('pipeline')
@ApiOAuth2(['admin'])
@Controller('api/pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PipelineController {
  constructor(
    private readonly config: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger an immediate pipeline run on the automation container',
  })
  @ApiBody({
    type: TriggerDto,
    required: false,
    description:
      'Optional profile override. Omit to use the profiles configured in AUTOMATION_PROFILES.',
  })
  @ApiResponse({ status: 202, description: 'Pipeline run started' })
  @ApiResponse({ status: 409, description: 'Pipeline is already running' })
  @ApiResponse({
    status: 503,
    description: 'Automation container not reachable',
  })
  async trigger(@Body() body?: TriggerDto, @Req() req?: any) {
    const triggerUrl = this.config.get<string>(
      'AUTOMATION_TRIGGER_URL',
      'http://mimosa-automation:8081',
    );

    const profiles =
      Array.isArray(body?.profiles) && body.profiles.length > 0
        ? body.profiles
        : undefined;

    let res: Response;
    try {
      res = await fetch(`${triggerUrl}/trigger`, {
        method: 'POST',
        headers: profiles ? { 'Content-Type': 'application/json' } : {},
        body: profiles ? JSON.stringify({ profiles }) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Automation container is not reachable.',
      );
    }

    if (res.status === 409) {
      throw new ConflictException('Pipeline is already running.');
    }

    if (!res.ok) {
      throw new ServiceUnavailableException('Automation trigger failed.');
    }

    const userEmail = req?.user?.email || 'unknown';
    await this.logsService.logPipelineTrigger(profiles ?? [], userEmail);

    return res.json();
  }
}
