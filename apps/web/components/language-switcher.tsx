'use client';

import { useI18n, languageOptions, type SupportedLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span>{t('language')}</span>
      <select
        aria-label={t('language')}
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
        value={language}
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
