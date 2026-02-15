'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import { PwaRegister } from '@/components/pwa-register';
import { ThemeProvider } from '@/lib/theme';
import { PageViewTracker } from '@/components/page-view-tracker';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <PwaRegister />
          <PageViewTracker />
          {children}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
