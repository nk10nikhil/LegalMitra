import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthService } from './supabase-auth.service';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly authService: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string; email?: string } }>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const user = await this.authService.verifyToken(token);
    request.user = { id: user.id, email: user.email };
    return true;
  }
}

export const ProtectedRoute = () => applyDecorators(UseGuards(RateLimitGuard, SupabaseAuthGuard));
