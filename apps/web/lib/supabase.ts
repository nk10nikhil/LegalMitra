import { createClient } from '@supabase/supabase-js';
import { webEnv } from './env';

const supabaseUrl = webEnv.supabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  webEnv.supabaseAnonKey || 'placeholder.eyJleHAiOjQ3NjQ4MDAwMDAsInJvbGUiOiJhbm9uIn0.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
