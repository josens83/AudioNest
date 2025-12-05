import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;
  private readonly smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  private readonly fromEmail: string;
  private readonly fromName: string;

  // Email templates
  private readonly templates: Record<string, EmailTemplate> = {
    welcome: {
      subject: 'AudioNest에 오신 것을 환영합니다! 🎧',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">환영합니다, {{name}}님!</h1>
          <p>AudioNest와 함께 프리미엄 오디오 콘텐츠의 세계로 떠나보세요.</p>
          <a href="{{appUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">시작하기</a>
        </div>
      `,
      text: '환영합니다, {{name}}님! AudioNest와 함께 프리미엄 오디오 콘텐츠의 세계로 떠나보세요.',
    },
    subscription_expiring: {
      subject: '구독이 곧 만료됩니다',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">구독 갱신 안내</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p>{{tierName}} 구독이 <strong>{{expiryDate}}</strong>에 만료됩니다.</p>
          <p>지금 갱신하시면 중단 없이 서비스를 이용하실 수 있습니다.</p>
          <a href="{{renewUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">구독 갱신하기</a>
        </div>
      `,
      text: '{{name}}님의 {{tierName}} 구독이 {{expiryDate}}에 만료됩니다. 지금 갱신하세요.',
    },
    subscription_renewed: {
      subject: '구독이 갱신되었습니다 ✨',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">구독 갱신 완료</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p>{{tierName}} 구독이 성공적으로 갱신되었습니다.</p>
          <p>다음 결제일: {{nextBillingDate}}</p>
        </div>
      `,
      text: '{{name}}님의 {{tierName}} 구독이 갱신되었습니다. 다음 결제일: {{nextBillingDate}}',
    },
    new_follower: {
      subject: '새로운 팔로워가 생겼습니다! 🎉',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">새 팔로워 알림</h1>
          <p><strong>{{followerName}}</strong>님이 회원님을 팔로우하기 시작했습니다.</p>
          <a href="{{profileUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">프로필 보기</a>
        </div>
      `,
      text: '{{followerName}}님이 회원님을 팔로우하기 시작했습니다.',
    },
    tip_received: {
      subject: '팁을 받았습니다! 💝',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">팁 수령 알림</h1>
          <p><strong>{{senderName}}</strong>님이 {{amount}} 코인을 팁으로 보냈습니다.</p>
          {{#if message}}<p>메시지: "{{message}}"</p>{{/if}}
          <a href="{{dashboardUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">대시보드 확인</a>
        </div>
      `,
      text: '{{senderName}}님이 {{amount}} 코인을 팁으로 보냈습니다.',
    },
    payout_processed: {
      subject: '정산이 완료되었습니다 💰',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">정산 완료</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p>요청하신 {{amount}}원 정산이 완료되었습니다.</p>
          <p>거래 ID: {{transactionId}}</p>
          <a href="{{dashboardUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">대시보드 확인</a>
        </div>
      `,
      text: '{{amount}}원 정산이 완료되었습니다. 거래 ID: {{transactionId}}',
    },
    gift_received: {
      subject: '선물 구독을 받았습니다! 🎁',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">선물 구독 도착!</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p><strong>{{senderName}}</strong>님이 {{tierName}} {{duration}}개월 구독을 선물로 보냈습니다!</p>
          {{#if message}}<p>메시지: "{{message}}"</p>{{/if}}
          <a href="{{redeemUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">선물 받기</a>
        </div>
      `,
      text: '{{senderName}}님이 {{tierName}} {{duration}}개월 구독을 선물로 보냈습니다!',
    },
    family_invite: {
      subject: '가족 요금제 초대장 📨',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">가족 요금제 초대</h1>
          <p>안녕하세요!</p>
          <p><strong>{{ownerName}}</strong>님이 가족 요금제에 초대했습니다.</p>
          <p>수락하시면 프리미엄 혜택을 함께 이용하실 수 있습니다.</p>
          <a href="{{inviteUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">초대 수락</a>
        </div>
      `,
      text: '{{ownerName}}님이 가족 요금제에 초대했습니다.',
    },
    achievement_unlocked: {
      subject: '새로운 업적을 달성했습니다! 🏆',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">업적 달성!</h1>
          <p>축하합니다, {{name}}님!</p>
          <p><strong>{{achievementName}}</strong> 업적을 달성했습니다.</p>
          <p>보상: {{rewardCoins}} 코인, {{rewardXp}} XP</p>
          <a href="{{profileUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">업적 확인</a>
        </div>
      `,
      text: '축하합니다! {{achievementName}} 업적을 달성했습니다. 보상: {{rewardCoins}} 코인, {{rewardXp}} XP',
    },
    new_episode: {
      subject: '새 에피소드가 공개되었습니다! 🎙️',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">새 에피소드</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p><strong>{{albumTitle}}</strong>의 새 에피소드가 공개되었습니다:</p>
          <h2>{{episodeTitle}}</h2>
          <p>{{episodeDescription}}</p>
          <a href="{{episodeUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">지금 듣기</a>
        </div>
      `,
      text: '{{albumTitle}}의 새 에피소드 "{{episodeTitle}}"가 공개되었습니다.',
    },
    password_reset: {
      subject: '비밀번호 재설정 안내',
      html: `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">비밀번호 재설정</h1>
          <p>안녕하세요, {{name}}님.</p>
          <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.</p>
          <a href="{{resetUrl}}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">비밀번호 재설정</a>
          <p style="color: #666; font-size: 12px;">이 링크는 24시간 동안만 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
        </div>
      `,
      text: '비밀번호 재설정 링크: {{resetUrl}} (24시간 유효)',
    },
  };

  constructor(private readonly config: ConfigService) {
    this.smtpConfig = {
      host: this.config.get<string>('SMTP_HOST', ''),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      user: this.config.get<string>('SMTP_USER', ''),
      pass: this.config.get<string>('SMTP_PASS', ''),
    };
    this.fromEmail = this.config.get<string>('EMAIL_FROM', 'noreply@audionest.app');
    this.fromName = this.config.get<string>('EMAIL_FROM_NAME', 'AudioNest');

    this.emailEnabled = !!this.smtpConfig.host && !!this.smtpConfig.user;

    if (!this.emailEnabled) {
      this.logger.warn('SMTP is not configured. Emails will be simulated.');
    }
  }

  async send(payload: EmailPayload): Promise<EmailResult> {
    let html = payload.html;
    let text = payload.text;
    let subject = payload.subject;

    // Process template if provided
    if (payload.templateId) {
      const template = this.templates[payload.templateId];
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${payload.templateId}`,
        };
      }

      subject = payload.subject || this.processTemplate(template.subject, payload.templateVariables || {});
      html = this.processTemplate(template.html, payload.templateVariables || {});
      text = this.processTemplate(template.text, payload.templateVariables || {});
    }

    if (!this.emailEnabled) {
      this.logger.debug(`[SIMULATED EMAIL] To: ${payload.to}`);
      this.logger.debug(`[SIMULATED EMAIL] Subject: ${subject}`);
      this.logger.debug(`[SIMULATED EMAIL] Body: ${text}`);
      return {
        success: true,
        messageId: `simulated-${Date.now()}`,
      };
    }

    try {
      const result = await this.sendWithSMTP({
        to: payload.to,
        subject,
        html,
        text,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTemplate(
    templateId: string,
    to: string,
    variables: Record<string, any>,
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: '',
      templateId,
      templateVariables: variables,
    });
  }

  async sendBulk(emails: EmailPayload[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the SMTP server
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(email => this.send(email)));

      for (const result of results) {
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      }

      // Add a small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { success, failed };
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    // Replace simple variables {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }

    // Handle conditionals {{#if variable}}...{{/if}}
    const conditionalRegex = /{{#if (\w+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(conditionalRegex, (match, variable, content) => {
      return variables[variable] ? content : '';
    });

    return result;
  }

  private async sendWithSMTP(payload: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<EmailResult> {
    // In a real implementation, this would use nodemailer or similar
    // For now, we'll simulate the SMTP sending

    // This is a placeholder for actual SMTP implementation
    // You would typically use nodemailer like:
    // const transporter = nodemailer.createTransport(this.smtpConfig);
    // const info = await transporter.sendMail({
    //   from: `"${this.fromName}" <${this.fromEmail}>`,
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: payload.html,
    //   text: payload.text,
    // });
    // return { success: true, messageId: info.messageId };

    this.logger.log(`Sending email to ${payload.to}: ${payload.subject}`);

    return {
      success: true,
      messageId: `smtp-${Date.now()}`,
    };
  }

  getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }
}
