import type { ReactNode } from 'react';
import { en, type MessageKey } from './en.ts';

function format(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = en[key];
  return vars ? format(raw, vars) : raw;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useLocale() {
  return { t };
}
