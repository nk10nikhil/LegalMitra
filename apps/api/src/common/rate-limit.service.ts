import { Injectable } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RateLimitService {
  private redis: Redis | null = null;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      this.redis = new Redis({ url, token });
    }
  }

  async check(key: string, limit = 60, windowSeconds = 60): Promise<boolean> {
    if (!this.redis) return true;

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    await this.redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    const count = await this.redis.zcard(key);
    await this.redis.expire(key, windowSeconds);

    return count <= limit;
  }
}
