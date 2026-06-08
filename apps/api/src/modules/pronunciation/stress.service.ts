// Word stress detection utilities

const STRESS_PATTERNS: Array<{ pattern: RegExp; rule: string }> = [
  { pattern: /tion$|sion$|ic$|ical$|ity$|ive$/i, rule: 'Trọng âm rơi vào âm tiết TRƯỚC hậu tố' },
  { pattern: /eer$|ese$|ette$|ique$|oon$/i, rule: 'Trọng âm rơi vào hậu tố' },
  { pattern: /ly$|ment$|ness$|less$|ful$/i, rule: 'Trọng âm KHÔNG đổi khi thêm hậu tố này' },
];

export function detectStressRule(word: string): string {
  for (const { pattern, rule } of STRESS_PATTERNS) {
    if (pattern.test(word)) return rule;
  }
  return 'Không có quy tắc đặc biệt — xem IPA để biết trọng âm';
}

export function syllabify(word: string): string[] {
  // Simple syllable splitter — approximation for display
  const vowels = 'aeiouy';
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < lower.length; i++) {
    current += lower[i];
    const isVowel = vowels.includes(lower[i]);
    const nextIsVowel = i + 1 < lower.length && vowels.includes(lower[i + 1]);
    const nextNextIsVowel = i + 2 < lower.length && vowels.includes(lower[i + 2]);

    if (isVowel && !nextIsVowel && nextNextIsVowel && current.length > 1) {
      syllables.push(current);
      current = '';
    }
  }
  if (current) syllables.push(current);
  return syllables.length > 0 ? syllables : [word];
}

export function formatStressDisplay(syllables: string[], stressIndex: number): string {
  return syllables
    .map((s, i) => i === stressIndex ? s.toUpperCase() : s)
    .join('-');
}
