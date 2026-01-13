import { createParamDecorator } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { UserRole } from '../user/type';

export type UserMetadata = {
  userId: string;
  role: UserRole;
  phoneOrEmail: string;
  phone?: string;
  email?: string;
};

export const GetUserMetadata = createParamDecorator(
  (data: unknown, ctx: ExecutionContextHost): UserMetadata | false => {
    const request: Request & { user: UserMetadata } = ctx
      .switchToHttp()
      .getRequest();
    return {
      userId: request.user.userId,
      role: request.user.role,
      phoneOrEmail: request.user.phoneOrEmail,
      phone: request.user.phone,
      email: request.user.email,
    };
  },
);
