import type { Subject, Mode } from '@/components/chat/types';
import { INTENT_PATTERNS } from '@/components/chat/constants';

export function detectSubject(pathname: string): Subject {
  if (pathname.startsWith('/math')) return 'math';
  if (pathname.startsWith('/language')) return 'language';
  if (pathname.startsWith('/viet')) return 'viet';
  return 'general';
}

export function inferMode(text: string): Mode | null {
  for (const { pattern, mode } of INTENT_PATTERNS) {
    if (pattern.test(text)) return mode;
  }
  return null;
}
