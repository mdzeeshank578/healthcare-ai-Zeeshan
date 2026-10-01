import nodemailer, { type Transporter } from "nodemailer";
export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user: string;
  password: string;
}
export class MailService {
  private readonly transporter: Transporter;
  public constructor(private readonly config: MailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }
  public async sendLoginOtp(to: string, otp: string): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `\n========================================\n[AUTH] Login OTP for ${to}: ${otp}\n========================================\n`,
      );
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject: "Your Smart Healthcare login code",
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.info(`[MAIL] Preview URL: ${previewUrl}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[MAIL] Warning: Failed to deliver email via SMTP (${error instanceof Error ? error.message : String(error)}). Using console OTP for local development.`,
        );
        return;
      }
      throw error;
    }
  }
}
