'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { supabase } from '@/lib/supabase';
import { webEnv } from '@/lib/env';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    if (!webEnv.supabaseUrl || !webEnv.supabaseAnonKey) {
      toast.error('Missing frontend Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local');
      return;
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Signed in successfully');
      router.push('/dashboard');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success('Account created and signed in');
      router.push('/dashboard');
      return;
    }

    toast.success('Account created. Please verify your email before signing in.');
    setMode('signin');
  }


  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <Card className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">LegalMitra</h1>
            <p className="text-sm text-slate-500">
              {mode === 'signin'
                ? 'Sign in with email and password.'
                : 'Create a new account with email and password.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full"
              onClick={() => setMode('signin')}
              type="button"
              variant={mode === 'signin' ? 'default' : 'outline'}
            >
              Sign In
            </Button>
            <Button
              className="w-full"
              onClick={() => setMode('signup')}
              type="button"
              variant={mode === 'signup' ? 'default' : 'outline'}
            >
              Sign Up
            </Button>
          </div>
          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <Input type="email" placeholder="you@example.com" {...register('email')} />
            <Input type="password" placeholder="••••••••" {...register('password')} />
            {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
            {errors.password ? <p className="text-xs text-rose-600">{errors.password.message}</p> : null}
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                  ? 'Continue with Email + Password'
                  : 'Create Account'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
