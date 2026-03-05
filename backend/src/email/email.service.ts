import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const portRaw = this.configService.get<string>('SMTP_PORT');
    const port = portRaw ? parseInt(portRaw, 10) : 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') || 'noreply@attendease.local';
    const subject = 'Your login verification code – Attend Ease';
    const html = `
      <p>Your verification code for Attend Ease is:</p>
      <h2 style="letter-spacing:8px;font-size:32px;font-weight:bold;color:#4F46E5;">${code}</h2>
      <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <p>If you did not attempt to sign in, please change your password immediately.</p>
    `;

    // Always log OTP to console for easy debugging (check your backend terminal)
    console.log(`[2FA OTP] Code for ${to}: ${code}`);

    if (this.transporter) {
      await this.transporter.sendMail({ from, to, subject, html });
    }
  }


  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') || 'noreply@attendease.local';
    const subject = 'Reset your password – Attend Ease';
    const html = `
      <p>You requested a password reset for your Attend Ease account.</p>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({ from, to, subject, html });
      return;
    }

    // No SMTP configured: log the link for local/dev use
    console.log('[Password reset] No SMTP configured. Reset link:', resetLink);
  }
}
