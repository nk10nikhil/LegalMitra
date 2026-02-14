import axios from 'axios';
import { webEnv } from './env';
import { supabase } from './supabase';

export const api = axios.create({
  baseURL: webEnv.apiUrl,
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
