'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { webEnv } from '@/lib/env';

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!webEnv.apiUrl || !pathname) return;

    const query = typeof window !== 'undefined' ? window.location.search.slice(1) : '';
    const path = query ? `${pathname}?${query}` : pathname;
    const payload = {
      path,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      title: typeof document !== 'undefined' ? document.title || undefined : undefined,
    };

    const url = `${webEnv.apiUrl.replace(/\/$/, '')}/analytics/page-view`;
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
