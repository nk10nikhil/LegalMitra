'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: { access_token: string } | null } }) => {
        if (!data.session && pathname.startsWith('/dashboard')) {
          router.replace('/');
        }
        setReady(true);
      });
  }, [pathname, router]);

  if (!ready) {
    return <div className="p-8 text-sm text-slate-500">Loading session...</div>;
  }

  return <>{children}</>;
}
