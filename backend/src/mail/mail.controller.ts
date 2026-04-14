import {
  Controller,
  Get,
  BadRequestException,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TestEmailDto } from './dto/test-email.dto';
import { buildTestEmail, buildTestText } from './templates/email-templates';

@ApiTags('mail')
@Controller('api/mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

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
}
