import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TestEmailDto } from './dto/test-email.dto';
import { PipelineAlertDto } from './dto/pipeline-alert.dto';
import {
  buildTestEmail,
  buildTestText,
  buildPipelineAlertEmail,
  buildPipelineAlertText,
} from './templates/email-templates';

@ApiTags('mail')
@Controller('api/mail')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('test')
  @ApiOperation({
    summary: 'Send test email',
    description:
      'Sends a test email using the standard alert template with dummy data. If no recipient is provided, it defaults to the authenticated user.',
  })
  async testEmail(
    @Query() query: TestEmailDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const userEmail = req.user?.email;
    if (!userEmail) {
      throw new BadRequestException('User email not found');
    }

    const recipient = query.to ?? userEmail;
    const html = buildTestEmail();
    const text = buildTestText();

    await this.mailService.sendMail(
      [recipient],
      'MIMOSA test email',
      html,
      text,
    );

    return { message: `Test email sent to ${recipient}` };
  }

  @UseGuards(JwtAuthGuard)
  @Post('pipeline-alert')
  @ApiOperation({
    summary: 'Send pipeline failure alert',
    description:
      'Sends a pipeline failure alert. If recipient is provided, sends to that address only. Otherwise sends to all users with pipeline failure alerts enabled.',
  })
  async pipelineAlert(
    @Body() dto: PipelineAlertDto,
  ): Promise<{ message: string }> {
    const html = buildPipelineAlertEmail(dto.errors, dto.profiles);
    const text = buildPipelineAlertText(dto.errors, dto.profiles);
    const subject = 'MIMOSA pipeline failure alert';

    if (dto.recipient) {
      await this.mailService.sendMail([dto.recipient], subject, html, text);
      return { message: `Pipeline alert sent to ${dto.recipient}` };
    }

    const users = await this.usersService.findUsersWithPipelineAlerts();
    const emails = users.map((u) => u.email).filter(Boolean);

    if (emails.length === 0) {
      return { message: 'No users opted in to pipeline failure alerts' };
    }

    await this.mailService.sendMail(emails, subject, html, text);
    return { message: `Pipeline alert sent to ${emails.length} user(s)` };
  }
}
