import {
  Controller,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOAuth2, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('pipeline')
@ApiOAuth2(['admin'])
@Controller('api/pipeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PipelineController {
  constructor(private readonly config: ConfigService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger an immediate pipeline run on the automation container',
  })
  @ApiResponse({ status: 202, description: 'Pipeline run started' })
  @ApiResponse({
    status: 503,
    description: 'Automation container not reachable',
  })
  async trigger() {
    const triggerUrl = this.config.get<string>(
      'AUTOMATION_TRIGGER_URL',
      'http://mimosa-automation:8081',
    );

    let res: Response;
    try {
      res = await fetch(`${triggerUrl}/trigger`, { method: 'POST' });
    } catch {
      throw new ServiceUnavailableException(
        'Automation container is not reachable.',
      );
    }

    if (!res.ok) {
      throw new ServiceUnavailableException('Automation trigger failed.');
    }

    return res.json();
  }
}
