import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const identity = request.ip ?? 'anonymous';
    const key = `ratelimit:${request.method}:${request.route?.path ?? request.path}:${identity}`;
    const allowed = await this.limiter.check(key, 120, 60);

    if (!allowed) throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
