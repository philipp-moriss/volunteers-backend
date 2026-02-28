import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcrypt';
import { TokenService } from './token.service';
import { UserService } from '../../user/user.service';
import { User } from '../../user/entities/user.entity';
import { UserRole, UserStatus } from '../../shared/user/type';
import { UserWithRoleData } from '../../user/types/user';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { EmailRegisterDto } from '../dto/email-register.dto';
import { EmailLoginDto } from '../dto/email-login.dto';
import { CreateAdminUserDto, LoginUserDto } from '../dto/auth-create-user.dto';
import { VerificationCode } from '../entities/verification-code.entity';
import { UserMetadata } from 'src/shared/decorators/get-user.decorator';
import { UpdateUserDto } from '../../user/dto/update-user.dto';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private smsService: SmsService,
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
  ) {}

  // ==================== SMS AUTHENTICATION ====================

  async sendSms(
    phone: string,
    isDev?: boolean,
  ): Promise<{ message: string; code?: string }> {
    try {
      // Генерируем код верификации
      const code = this.generateVerificationCode();

      if (isDev) {
        await this.saveVerificationCode(phone, code);
        return {
          message: 'Verification code for development (message not sent)',
          code,
        };
      }

      await this.saveVerificationCode(phone, code);
      // <#> prefix lets the phone suggest pasting the code into the input (Google SMS verification)
      const smsText = `<#> Your verification code is: ${code}`;
      await this.smsService.send(phone, smsText);

      return {
        message: 'Verification code sent',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async authenticateWithSms(
    phone: string,
    code: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    // Проверка кода
    const verificationResult = await this.verifyCode(phone, code);
    if (!verificationResult.success) {
      throw new UnauthorizedException(verificationResult.message);
    }

    // Форматируем номер телефона
    const formattedPhone = this.formatPhoneNumber(phone);

    const user = await this.userService.findByPhone(formattedPhone);

    if (!user) {
      // Пользователь не найден
      // По спецификации:
      // - Нуждающиеся создаются ТОЛЬКО админом через админ-панель, поэтому если это нуждающийся - он уже должен быть в системе
      // - Волонтеры регистрируются сами: сначала авторизация по телефону + SMS (создается базовая запись), потом онбординг
      // Создаем базовую запись для волонтера (он пройдет онбординг позже)
      // Это соответствует спецификации раздел 3.1.2: "1. Авторизация по телефону" - создаем пользователя
      const newUser = await this.userService.create({
        phone: formattedPhone,
        role: UserRole.VOLUNTEER,
        status: UserStatus.PENDING,
      });

      if (ipAddress) {
        await this.userService.updateLastLogin(newUser.id);
      }

      return this.generateAuthTokens(newUser);
    }

    if (user.role !== UserRole.VOLUNTEER && user.role !== UserRole.NEEDY) {
      throw new UnauthorizedException('Invalid user type for SMS authentication');
    }

    // Обновляем информацию о входе
    if (ipAddress) {
      await this.userService.updateLastLogin(user.id);
    }

    return this.generateAuthTokens(user);
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.cleanupExpiredVerificationCodes();
  }

  // ==================== EMAIL AUTHENTICATION ====================

  async registerWithEmail(
    registerDto: EmailRegisterDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName } = registerDto;

    // Проверяем, что пользователь с таким email не существует
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Хешируем пароль
    const hashedPassword = await hash(password, 10);

    const user = await this.userService.create({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    });

    if (ipAddress) {
      await this.userService.updateLastLogin(user.id);
    }

    return this.generateAuthTokens(user);
  }

  async authenticateWithEmail(
    loginDto: EmailLoginDto,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userService.findUserByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password not set for this user');
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (ipAddress) {
      await this.userService.updateLastLogin(user.id);
    }

    return this.generateAuthTokens(user);
  }

  // ==================== TOKEN MANAGEMENT ====================

  async refreshTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    try {
      try {
        await this.tokenService.verifyAccessToken(accessToken);
      } catch {
        // Access token может быть истекшим, это нормально для refresh
      }

      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userService.findById(payload.userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const isTokenValid = await compare(refreshToken, user.refreshTokenHash);
      if (!isTokenValid) {
        throw new UnauthorizedException('Refresh token is invalid');
      }

      return this.generateAuthTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userService.invalidateRefreshToken(userId);
  }

  async validateRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userService.findById(payload.userId);

      if (!user || !user.refreshTokenHash) {
        return false;
      }

      return await compare(refreshToken, user.refreshTokenHash);
    } catch {
      return false;
    }
  }

  // ==================== LEGACY METHODS (для обратной совместимости) ====================

  async loginAdmin(loginUserDto: LoginUserDto) {
    return this.authenticateWithEmail(loginUserDto);
  }

  async registerAdmin(
    createAdminUserDto: CreateAdminUserDto,
  ): Promise<AuthResponseDto> {
    return this.registerWithEmail({
      email: createAdminUserDto.email,
      password: createAdminUserDto.password,
      firstName: createAdminUserDto.firstName || '',
      lastName: createAdminUserDto.lastName || '',
    });
  }

  // ==================== USER PROFILE ====================

  async getMe(
    authenticatedUser: UserMetadata,
  ): Promise<UserWithRoleData> {
    return this.userService.findOneWithRoleData(authenticatedUser.userId);
  }

  async updateMe(
    authenticatedUser: UserMetadata,
    updateUserDto: Partial<UpdateUserDto>,
  ): Promise<UserWithRoleData> {
    return this.userService.update(authenticatedUser.userId, updateUserDto);
  }

  // ==================== PRIVATE METHODS ====================

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Убираем все символы кроме цифр
    const digits = phoneNumber.replace(/\D/g, '');

    // Если номер начинается с 8, заменяем на +7
    if (digits.startsWith('8') && digits.length === 11) {
      return '+7' + digits.substring(1);
    }

    // Если номер начинается с 7, добавляем +
    if (digits.startsWith('7') && digits.length === 11) {
      return '+' + digits;
    }

    // Если номер уже в международном формате
    if (digits.startsWith('7') && digits.length === 10) {
      return '+7' + digits;
    }

    // Возвращаем как есть, если уже в правильном формате
    return phoneNumber.startsWith('+') ? phoneNumber : '+' + digits;
  }

  private async generateAuthTokens(user: User): Promise<AuthResponseDto> {
    const phoneOrEmail = user.phone || user.email || '';
    const accessToken = await this.tokenService.generateAccessToken(
      user.id,
      user.role,
      phoneOrEmail,
    );
    const refreshToken = await this.tokenService.generateRefreshToken(
      user.id,
      user.role,
      phoneOrEmail,
    );

    const refreshTokenHash = await hash(refreshToken, 10);
    await this.userService.updateRefreshToken(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        role: user.role,
        status: user.status,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  private async verifyCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const verificationCode = await this.verificationCodeRepository.findOne({
        where: { phoneNumber: formattedPhone, code, isUsed: false },
      });

      if (!verificationCode) {
        return { success: false, message: 'Invalid verification code' };
      }

      if (verificationCode.expiresAt < new Date()) {
        return { success: false, message: 'Verification code expired' };
      }

      verificationCode.isUsed = true;
      await this.verificationCodeRepository.save(verificationCode);

      return { success: true, message: 'Verification code confirmed' };
    } catch (error) {
      return { success: false, message: 'Error verifying code' };
    }
  }

  private async saveVerificationCode(
    phone: string,
    code: string,
  ): Promise<void> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      // Удаляем старые коды для этого номера
      await this.verificationCodeRepository.delete({
        phoneNumber: formattedPhone,
      });

      // Создаем новый код
      const verificationCode = this.verificationCodeRepository.create({
        phoneNumber: formattedPhone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
      });

      await this.verificationCodeRepository.save(verificationCode);
    } catch (error) {
      throw error;
    }
  }

  private async cleanupExpiredVerificationCodes(): Promise<void> {
    try {
      const expiredCodes = await this.verificationCodeRepository
        .createQueryBuilder('verificationCode')
        .where('verificationCode.expiresAt < :now', { now: new Date() })
        .getMany();

      if (expiredCodes.length > 0) {
        await this.verificationCodeRepository.remove(expiredCodes);
      }
    } catch (error) {
      throw error;
    }
  }
}
