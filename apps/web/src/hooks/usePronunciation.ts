'use client';

import { useState, useCallback } from 'react';
import {
  fetchPronunciation,
  fetchPronunciationScore,
  fetchIpaGuide,
  type PronunciationResult,
  type ScoreResult,
  type IpaGuide,
} from '@/services/pronunciationApi';

export function usePronunciation() {
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [ipaGuide, setIpaGuide] = useState<IpaGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchPronunciation(text);
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi phân tích phát âm');
    } finally {
      setLoading(false);
    }
  }, []);

  const scoreSpoken = useCallback(async (expected: string, spoken: string) => {
    if (!expected.trim() || !spoken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchPronunciationScore(expected, spoken);
      setScoreResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi chấm điểm phát âm');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIpaGuide = useCallback(async () => {
    if (ipaGuide) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchIpaGuide();
      setIpaGuide(r.guide);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải bảng IPA');
    } finally {
      setLoading(false);
    }
  }, [ipaGuide]);

  const reset = useCallback(() => {
    setResult(null);
    setScoreResult(null);
    setError(null);
  }, []);

  return { result, scoreResult, ipaGuide, loading, error, analyze, scoreSpoken, loadIpaGuide, reset };
}
