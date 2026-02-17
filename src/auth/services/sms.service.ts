import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_SMS_API_URL = 'https://019sms.co.il/api';

interface Sms019Response {
  status?: number;
  message?: string;
  token?: string;
}


@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const apiUrl =
      this.configService.get<string>('SMS_API_019_URL')?.trim() ||
      DEFAULT_SMS_API_URL;
    const envToken = this.configService.get<string>('SMS_API_019');
    const username = this.configService.get<string>('SMS_USERNAME')?.trim();
    const source = this.configService.get<string>('SMS_SOURCE');

    if (!envToken?.trim() || !source?.trim() || !username) {
      this.logger.warn(
        'SMS not sent: SMS_API_019, SMS_SOURCE or SMS_USERNAME is missing',
      );
      throw new BadRequestException(
        'SMS service is not configured. Contact the administrator.',
      );
    }

    // 019sms docs: request current token (action "current") to avoid error 11 "use newer token"
    let token = envToken;

    const normalizedPhone = this.normalizePhoneForApi(phone);
    const isInternational = this.isInternationalNumber(normalizedPhone);

    // 019sms format: root "sms" object, user.username and destinations.phone as array
    const smsPayload: Record<string, unknown> = {
      user: { username },
      source,
      destinations: {
        phone: [{ _: normalizedPhone }],
      },
      message,
    };
    if (isInternational) {
      smsPayload.includes_international = '1';
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sms: smsPayload }),
    });

    const responseText = await response.text();
    let data: Sms019Response = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      this.logger.warn(
        `019sms response is not JSON: ${responseText.slice(0, 200)}`,
      );
    }

    const status = data.status ?? (response.ok ? 0 : -1);

    if (status !== 0) {
      const msg = data.message ?? responseText ?? `HTTP ${response.status}`;
      this.logger.warn(`019sms error status=${status} message=${msg}`);
      if (status === 3 || status === 10 || status === 11) {
        const hint =
          status === 11
            ? ' Token and SMS_USERNAME must belong to the same 019sms account; create a new token in the dashboard (Settings → API Token Management) for the user set in SMS_USERNAME.'
            : '';
        throw new ServiceUnavailableException(
          `SMS service authentication error.${hint}`,
        );
      }
      if (status === 4 || status === 12) {
        throw new ServiceUnavailableException(
          'Insufficient balance on SMS service account.',
        );
      }
      if (status === 2) {
        throw new BadRequestException(
          'SMS request is missing a required field (e.g. username). Set SMS_USERNAME in .env.',
        );
      }
      if (status === 9) {
        throw new BadRequestException('Invalid phone number format.');
      }
      if (status === 997) {
        throw new BadRequestException(
          'Invalid SMS API command. Check request format (username, source, destinations, message).',
        );
      }
      throw new ServiceUnavailableException(
        `SMS send error: ${typeof msg === 'string' ? msg : 'unknown error'}`,
      );
    }
  }
  /**
   * Normalize phone for 019sms API: digits only, no "+".
   * Israeli format: 05xxxxxxxx or 5xxxxxxxx.
   */
  private normalizePhoneForApi(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits.length) return phone;

    // Israel: 972 + 9 digits -> 0 + 9 digits
    if (digits.startsWith('972') && digits.length === 12) {
      return '0' + digits.slice(3);
    }
    if (digits.startsWith('972') && digits.length === 11) {
      return '0' + digits.slice(2);
    }
    // Already Israeli format 05... or 5...
    if (
      (digits.length === 10 && digits.startsWith('05')) ||
      (digits.length === 9 && digits.startsWith('5'))
    ) {
      return digits;
    }
    // International: keep leading 0 (019sms accepts with includes_international)
    if (digits.startsWith('0')) {
      return digits;
    }
    return digits;
  }

  private isInternationalNumber(normalizedPhone: string): boolean {
    const digits = normalizedPhone.replace(/\D/g, '');
    // Israel: 9 digits (5xxxxxxxx) or 10 (05xxxxxxxx)
    if (digits.length === 9 && digits.startsWith('5')) return false;
    if (digits.length === 10 && digits.startsWith('05')) return false;
    return true;
  }
}
