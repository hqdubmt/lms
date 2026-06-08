import { env } from '../../config/env';
import { callAIForJSON, isAnyAIAvailable } from '../../services/ai-provider';

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

const WORD_PROMPT = (word: string) => `You are an English pronunciation expert helping Vietnamese learners.

Analyze the pronunciation of: "${word}"

Return ONLY valid JSON:
{
  "ipa": "IPA transcription e.g. /ˈæpəl/",
  "stress": "syllable breakdown with CAPS for stress e.g. AP-ple",
  "syllables": "syllable count and breakdown e.g. 2 syllables: ap-ple",
  "vietnameseHint": "approximate Vietnamese pronunciation hint e.g. ép-pồ",
  "commonMistakes": ["mistake1 in Vietnamese", "mistake2 in Vietnamese"],
  "tips": ["tip1 in Vietnamese", "tip2 in Vietnamese"]
}`;

const SENTENCE_PROMPT = (sentence: string) => `You are an English pronunciation expert helping Vietnamese learners.

Analyze the pronunciation of this sentence: "${sentence}"

Return ONLY valid JSON:
{
  "ipa": "IPA transcription of full sentence",
  "stress": "key stressed words in sentence",
  "linking": "natural linking sounds e.g. How-r-you",
  "reduction": "reduced sounds e.g. 'and' → /ən/, 'to' → /tə/",
  "tips": ["natural speaking tip 1 in Vietnamese", "tip 2 in Vietnamese"]
}`;

export async function analyzePronunciation(text: string): Promise<PronunciationResult> {
  const isWord = !text.includes(' ') && text.length <= 30;
  const prompt = isWord ? WORD_PROMPT(text) : SENTENCE_PROMPT(text);

  let raw: Record<string, any> = {};

  try {
    if (env.ANTHROPIC_API_KEY) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });
      const txt = response.content[0].type === 'text' ? response.content[0].text : '';
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) raw = JSON.parse(m[0]);
    } else if (await isAnyAIAvailable()) {
      const txt = await callAIForJSON('You are a pronunciation expert. Return only valid JSON.', prompt, 512);
      if (txt) {
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) raw = JSON.parse(m[0]);
      }
    }
  } catch {
    // fall through to defaults
  }

  return {
    ipa: raw.ipa ?? `/${text}/`,
    stress: raw.stress ?? text.toUpperCase(),
    syllables: raw.syllables,
    vietnameseHint: raw.vietnameseHint,
    linking: raw.linking,
    reduction: raw.reduction,
    commonMistakes: raw.commonMistakes ?? [],
    tips: Array.isArray(raw.tips) ? raw.tips : ['Hãy nghe mẫu và luyện tập từng âm một.'],
    type: isWord ? 'word' : 'sentence',
  };
}
