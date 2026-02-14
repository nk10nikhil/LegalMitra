import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new ServiceUnavailableException(
        'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env',
      );
    }

    this.client = createClient(supabaseUrl, serviceRoleKey);
    return this.client;
  }

  async verifyToken(token?: string) {
    if (!token) throw new UnauthorizedException('Missing auth token');
    const { data, error } = await this.getClient().auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }
    return data.user;
  }
}
