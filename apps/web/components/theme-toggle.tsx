'use client';

import { useTheme, type ThemeMode } from '@/lib/theme';

const options: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <span>Theme</span>
      <select
        aria-label="Theme"
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onChange={(event) => setTheme(event.target.value as ThemeMode)}
        value={theme}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
