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
      console.warn('[Mail] Notifications disabled — skipping email');
      return { skipped: true };
    }

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (!smtpHost || smtpHost === 'your.smtp.server') {
      console.warn(
        '[Mail] SMTP not configured — set MAIL_HOST (and related SMTP_* vars) in .env to enable email delivery',
      );
      return { skipped: true };
    }

    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM'),
        to: to.join(','),
        subject,
        html,
        text,
      });

      console.log(`[Mail] Sent to: ${to.join(', ')}`);
      return { sent: true };
    } catch (err: any) {
      if (err?.code === 'EDNS' || err?.code === 'ENOTFOUND') {
        console.error(
          `[Mail] Cannot reach SMTP server "${smtpHost}" — check SMTP_HOST in .env`,
        );
      } else if (err?.code === 'ECONNREFUSED') {
        console.error(
          `[Mail] SMTP connection refused at "${smtpHost}:${this.configService.get('SMTP_PORT')}" — check SMTP_PORT and firewall rules`,
        );
      } else {
        console.error(`[Mail] Failed to send email: ${err?.message ?? err}`);
      }
      return { skipped: true };
    }
  }
}
