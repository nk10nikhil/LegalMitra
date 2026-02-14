'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { webEnv } from '@/lib/env';

const signInSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  dob: z.string().min(1, 'Enter date of birth'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
  email: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? '')
    .pipe(z.union([z.literal(''), z.string().email('Enter a valid email')])),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  aadhaarNumber: z.string().regex(/^[0-9]{12}$/, 'Aadhaar must be 12 digits'),
  role: z.enum(['citizen', 'lawyer', 'judge', 'admin']),
});

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type SignInInput = z.infer<typeof signInSchema>;
type SignUpInput = z.infer<typeof signUpSchema>;
type ForgotInput = z.infer<typeof forgotSchema>;
type UserRole = 'citizen' | 'lawyer' | 'judge' | 'admin';

const roleRoutes: Record<UserRole, string> = {
  citizen: '/dashboard/citizen',
  lawyer: '/dashboard/lawyer',
  judge: '/dashboard/judge',
  admin: '/dashboard/admin',
};

function parseIdentifier(identifier: string) {
  const cleaned = identifier.trim();
  if (cleaned.includes('@')) {
    return { email: cleaned };
  }
  return { phone: cleaned };
}

async function routeToRoleDashboard(router: ReturnType<typeof useRouter>) {
  const profile = (await api.get<{ role: UserRole }>('/profiles/me')).data;
  router.push(roleRoutes[profile.role] ?? '/dashboard');
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  const {
    register: registerSignIn,
    handleSubmit: handleSubmitSignIn,
    getValues: getSignInValues,
    trigger: triggerSignIn,
    formState: { errors: signInErrors, isSubmitting: signInSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const {
    register: registerSignUp,
    handleSubmit: handleSubmitSignUp,
    formState: { errors: signUpErrors, isSubmitting: signUpSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { role: 'citizen' },
  });

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors, isSubmitting: forgotSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  async function sendMagicLink() {
    const validIdentifier = await triggerSignIn('identifier');
    if (!validIdentifier) {
      toast.error('Enter a valid email first');
      return;
    }

    const identifier = getSignInValues('identifier');
    if (!identifier.includes('@')) {
      toast.error('Magic link requires an email address');
      return;
    }

    const validEmail = await triggerSignIn('identifier');
    if (!validEmail) {
      toast.error('Enter a valid email first');
      return;
    }

    if (!webEnv.supabaseUrl || !webEnv.supabaseAnonKey) {
      toast.error(
        'Missing frontend Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local',
      );
      return;
    }

    const email = getSignInValues('identifier').trim();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Magic link sent. Check inbox/spam or Supabase Auth logs.');
  }

  async function onSignIn(values: SignInInput) {
    if (!webEnv.supabaseUrl || !webEnv.supabaseAnonKey) {
      toast.error(
        'Missing frontend Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local',
      );
      return;
    }

    const credentials = parseIdentifier(values.identifier);
    const { error } = await supabase.auth.signInWithPassword({
      ...credentials,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Signed in successfully');
    await routeToRoleDashboard(router);
  }

  async function onSignUp(values: SignUpInput) {
    if (!webEnv.supabaseUrl || !webEnv.supabaseAnonKey) {
      toast.error(
        'Missing frontend Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local',
      );
      return;
    }

    const normalizedEmail = values.email?.trim() || undefined;
    const signUpPayload = {
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          fullName: values.fullName,
          dob: values.dob,
          phone: values.phone,
          role: values.role,
        },
      },
    };

    const { data, error } = await supabase.auth.signUp(
      normalizedEmail
        ? {
            email: normalizedEmail,
            ...signUpPayload,
          }
        : {
            phone: values.phone,
            ...signUpPayload,
          },
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      await api.put('/profiles/me', {
        fullName: values.fullName,
        email: normalizedEmail,
        phone: values.phone,
        dob: values.dob,
        aadhaarNumber: values.aadhaarNumber,
        role: values.role,
      });

      toast.success('Account created and signed in');
      router.push(roleRoutes[values.role]);
      return;
    }

    toast.success(
      normalizedEmail
        ? 'Account created. Verify your email, then sign in to complete dashboard access.'
        : 'Account created. Sign in now with mobile number and password.',
    );
    setMode('signin');
  }

  async function onForgotPassword(values: ForgotInput) {
    if (!webEnv.supabaseUrl || !webEnv.supabaseAnonKey) {
      toast.error(
        'Missing frontend Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local',
      );
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password reset link sent to your email.');
    setMode('signin');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <Card className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">LegalMitra</h1>
            <p className="text-sm text-slate-500">
              {mode === 'signin' && 'Sign in with email/mobile and password.'}
              {mode === 'signup' && 'Create account with full profile details.'}
              {mode === 'forgot' && 'Reset your password using email link.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
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
            <Button
              className="w-full"
              onClick={() => setMode('forgot')}
              type="button"
              variant={mode === 'forgot' ? 'default' : 'outline'}
            >
              Forgot
            </Button>
          </div>
          {mode === 'signin' ? (
            <form className="space-y-3" onSubmit={handleSubmitSignIn(onSignIn)}>
              <Input placeholder="Email or mobile number" {...registerSignIn('identifier')} />
              <Input type="password" placeholder="••••••••" {...registerSignIn('password')} />
              {signInErrors.identifier ? (
                <p className="text-xs text-rose-600">{signInErrors.identifier.message}</p>
              ) : null}
              {signInErrors.password ? (
                <p className="text-xs text-rose-600">{signInErrors.password.message}</p>
              ) : null}
              <Button className="w-full" disabled={signInSubmitting} type="submit">
                {signInSubmitting ? 'Signing in...' : 'Continue with Email/Mobile + Password'}
              </Button>
              <Button className="w-full" onClick={sendMagicLink} type="button" variant="outline">
                Send Magic Link Instead
              </Button>
            </form>
          ) : null}

          {mode === 'signup' ? (
            <form className="space-y-3" onSubmit={handleSubmitSignUp(onSignUp)}>
              <Input placeholder="Full name" {...registerSignUp('fullName')} />
              <Input type="date" {...registerSignUp('dob')} />
              <Input placeholder="Mobile number" {...registerSignUp('phone')} />
              <Input type="email" placeholder="Email (optional)" {...registerSignUp('email')} />
              <Input type="password" placeholder="Password" {...registerSignUp('password')} />
              <Input placeholder="Aadhaar number" {...registerSignUp('aadhaarNumber')} />
              <select
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                {...registerSignUp('role')}
              >
                <option value="citizen">Citizen</option>
                <option value="lawyer">Lawyer</option>
                <option value="judge">Judge</option>
                <option value="admin">Admin</option>
              </select>

              {Object.values(signUpErrors).map((error) =>
                error?.message ? (
                  <p className="text-xs text-rose-600" key={error.message.toString()}>
                    {error.message.toString()}
                  </p>
                ) : null,
              )}

              <Button className="w-full" disabled={signUpSubmitting} type="submit">
                {signUpSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form className="space-y-3" onSubmit={handleSubmitForgot(onForgotPassword)}>
              <Input type="email" placeholder="you@example.com" {...registerForgot('email')} />
              {forgotErrors.email ? (
                <p className="text-xs text-rose-600">{forgotErrors.email.message}</p>
              ) : null}
              <Button className="w-full" disabled={forgotSubmitting} type="submit">
                {forgotSubmitting ? 'Sending reset link...' : 'Send Password Reset Link'}
              </Button>
            </form>
          ) : null}
        </Card>
      </motion.div>
    </main>
  );
}
