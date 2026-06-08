export interface PronunciationResult {
  ipa: string;
  stress: string;
  syllables?: string;
  vietnameseHint?: string;
  linking?: string;
  reduction?: string;
  commonMistakes?: string[];
  tips: string[];
  type: 'word' | 'sentence';
}

export interface ScoreResult {
  score: number;
  mistakes: Array<{ expected: string; spoken: string; position: number }>;
  tips: string[];
}

export interface IpaGuideEntry {
  symbol: string;
  example: string;
  hint: string;
}

export interface IpaGuide {
  vowels: IpaGuideEntry[];
  diphthongs: IpaGuideEntry[];
  consonants: IpaGuideEntry[];
}

export interface HistoryEntry {
  type?: 'score';
  text?: string;
  expected?: string;
  spoken?: string;
  score?: number;
  mistakes?: Array<{ expected: string; spoken: string; position: number }>;
  at: string;
}

async function authFetch(path: string, opts?: RequestInit) {
  return fetch(path, { credentials: 'include', ...opts });
}

export async function fetchPronunciation(text: string): Promise<PronunciationResult> {
  const res = await authFetch('/api/ai/pronunciation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Lỗi phân tích phát âm');
  return res.json();
}

export async function fetchPronunciationScore(expected: string, spoken: string): Promise<ScoreResult> {
  const res = await authFetch('/api/ai/pronunciation-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected, spoken }),
  });
  if (!res.ok) throw new Error('Lỗi chấm điểm phát âm');
  return res.json();
}

export async function fetchIpaGuide(): Promise<{ guide: IpaGuide; text: string }> {
  const res = await authFetch('/api/ai/ipa-guide');
  if (!res.ok) throw new Error('Lỗi tải bảng IPA');
  return res.json();
}

export async function fetchPronunciationHistory(): Promise<{
  history: HistoryEntry[];
  pronunciationCount: number;
  averagePronunciationScore: number;
  bestPronunciationScore: number;
}> {
  const res = await authFetch('/api/ai/pronunciation-history');
  if (!res.ok) throw new Error('Lỗi tải lịch sử');
  return res.json();
}
