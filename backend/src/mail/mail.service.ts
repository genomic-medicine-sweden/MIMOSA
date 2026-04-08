import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {}

  private isEnabled(): boolean {
    return this.configService.get<string>('NOTIFICATIONS_ENABLED') === 'true';
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      tls: {
        rejectUnauthorized:
          this.configService.get<string>('SMTP_REJECT_UNAUTHORIZED') === 'true',
      },
    });

    return this.transporter;
  }

  async sendMail(to: string[], subject: string, html: string, text: string) {
    if (!this.isEnabled()) {
      console.warn('Notifications disabled — skipping email');
      return { skipped: true };
    }

    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: this.configService.get<string>('SMTP_FROM'),
      to: to.join(','),
      subject,
      html,
      text,
    });

    console.log(`Email sent to: ${to.join(', ')}`);
    return { sent: true };
  }
}
