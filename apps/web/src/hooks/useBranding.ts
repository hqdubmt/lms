import { useEffect, useState } from 'react';
import { siteConfig } from '@/config/site';

interface BrandingSettings {
  logoBg: string;
  logoBgHeight: number;
}

// Module-level cache — shared across all component instances
let _cache: Record<string, string> | null = null;
let _fetchedAt = 0;
const TTL = 60_000; // re-fetch every 60s

async function fetchSettings(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _fetchedAt < TTL) return _cache;
  try {
    const res = await fetch('/api/site-settings', { cache: 'no-store' });
    if (res.ok) {
      _cache = await res.json();
      _fetchedAt = Date.now();
      return _cache!;
    }
  } catch {}
  return _cache || {};
}

export function useBranding(): BrandingSettings {
  const [settings, setSettings] = useState<Record<string, string>>(_cache || {});

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  return {
    logoBg: settings.logoBg ?? siteConfig.logoBg,
    logoBgHeight: settings.logoBgHeight ? Number(settings.logoBgHeight) : siteConfig.logoBgHeight,
  };
}

// Call this after admin changes branding to force re-fetch
export function invalidateBrandingCache() {
  _cache = null;
  _fetchedAt = 0;
}
