// Pronunciation scoring by comparing expected vs spoken text

interface ScoreResult {
  score: number;
  mistakes: Array<{ expected: string; spoken: string; position: number }>;
  tips: string[];
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function wordEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function scorePronunciation(expected: string, spoken: string): ScoreResult {
  const expWords = normalise(expected).split(' ');
  const spkWords = normalise(spoken).split(' ');

  const mistakes: ScoreResult['mistakes'] = [];
  const tips: string[] = [];

  let totalSimilarity = 0;

  const len = Math.max(expWords.length, spkWords.length);
  for (let i = 0; i < len; i++) {
    const exp = expWords[i] ?? '';
    const spk = spkWords[i] ?? '';

    if (!exp && spk) {
      mistakes.push({ expected: '[thừa từ]', spoken: spk, position: i });
      continue;
    }
    if (exp && !spk) {
      mistakes.push({ expected: exp, spoken: '[bỏ từ]', position: i });
      tips.push(`Bạn đã bỏ qua từ "${exp}" — hãy thực hành nói đủ từng từ.`);
      totalSimilarity += 0;
      continue;
    }

    const dist = wordEditDistance(exp, spk);
    const maxLen = Math.max(exp.length, spk.length);
    const wordSim = maxLen === 0 ? 1 : 1 - dist / maxLen;
    totalSimilarity += wordSim;

    if (wordSim < 0.75) {
      mistakes.push({ expected: exp, spoken: spk, position: i });
      tips.push(`"${exp}" → bạn nói "${spk}" — hãy luyện thêm từ này.`);
    }
  }

  const score = expWords.length > 0
    ? Math.round((totalSimilarity / Math.max(expWords.length, spkWords.length)) * 100)
    : 0;

  if (score >= 90) tips.push('Xuất sắc! Phát âm rất chuẩn.');
  else if (score >= 75) tips.push('Tốt! Tiếp tục luyện tập những từ còn sai.');
  else if (score >= 50) tips.push('Cần cải thiện. Hãy nghe mẫu và luyện từng từ một.');
  else tips.push('Hãy nghe lại câu mẫu nhiều lần trước khi luyện tập.');

  return { score: Math.min(100, Math.max(0, score)), mistakes, tips };
}
