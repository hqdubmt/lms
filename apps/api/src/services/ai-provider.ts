/**
 * Multi-provider AI service: Groq → Gemini → Ollama (fallback chain)
 * - Groq free: 6000 req/day, ~500 tok/s, llama-3.3-70b
 * - Gemini free: 1500 req/day, gemini-2.0-flash, best Vietnamese
 * - Ollama: local, unlimited, slowest
 */

import Groq from 'groq-sdk';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const OLLAMA_LIGHT = process.env.OLLAMA_LIGHT_MODEL || 'qwen2.5:1.5b';

export type AIProvider = 'groq' | 'gemini' | 'ollama';

export interface ProviderStatus {
  provider: AIProvider;
  available: boolean;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return new Groq({ apiKey: key });
}

async function callGroqForJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string | null> {
  const client = getGroqClient();
  if (!client) return null;
  try {
    const res = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
      // No response_format: json_object — Groq rejects plain arrays with that mode
    });
    return res.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function groqChat(messages: ChatMessage[]): Promise<string> {
  const client = getGroqClient();
  if (!client) throw new Error('Groq không khả dụng');
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: messages as any,
    max_tokens: 512,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content ?? '';
}

async function* groqStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const client = getGroqClient();
  if (!client) throw new Error('Groq không khả dụng');
  const stream = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: messages as any,
    max_tokens: 512,
    temperature: 0.7,
    stream: true,
  });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiKey(): string | null {
  return process.env.GOOGLE_GEMINI_API_KEY || null;
}

async function callGeminiForJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string | null> {
  const key = getGeminiKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: maxTokens,
            temperature: 0.1,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function geminiChat(messages: ChatMessage[]): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('Gemini không khả dụng');

  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const convo = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: convo,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function* geminiStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('Gemini không khả dụng');

  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const convo = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: convo,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!res.ok || !res.body) throw new Error('Gemini stream error');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const parsed = JSON.parse(json) as any;
        const token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (token) yield token;
      } catch { /* skip */ }
    }
  }
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

async function callOllamaForJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string | null> {
  try {
    // Use light model for JSON generation — much faster (1.5b vs 7b)
    const jsonModel = OLLAMA_LIGHT;
    const cappedTokens = Math.min(maxTokens, 2048); // cap at 2048 for speed
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: jsonModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: cappedTokens, num_ctx: 4096 },
      }),
      signal: AbortSignal.timeout(120_000), // 2min max per call
    });
    if (!res.ok) return null;
    const data = await res.json() as { message?: { content: string } };
    return data.message?.content ?? null;
  } catch {
    return null;
  }
}

async function ollamaChat(messages: ChatMessage[], light = false): Promise<string> {
  const model = light ? OLLAMA_LIGHT : OLLAMA_MODEL;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json() as { message?: { content: string } };
  return data.message?.content ?? '';
}

async function* ollamaStream(messages: ChatMessage[], light = false): AsyncGenerator<string> {
  const model = light ? OLLAMA_LIGHT : OLLAMA_MODEL;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok || !res.body) throw new Error('Ollama không khả dụng');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { message?: { content: string }; done?: boolean };
        if (parsed.message?.content) yield parsed.message.content;
        if (parsed.done) return;
      } catch { /* skip */ }
    }
  }
}

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkAllProviders(): Promise<{
  available: boolean;
  provider: AIProvider | null;
  providers: ProviderStatus[];
  model: string;
}> {
  const [ollamaOk] = await Promise.all([isOllamaAvailable()]);

  const providers: ProviderStatus[] = [
    { provider: 'groq', available: !!getGroqClient(), model: GROQ_MODEL },
    { provider: 'gemini', available: !!getGeminiKey(), model: GEMINI_MODEL },
    { provider: 'ollama', available: ollamaOk, model: OLLAMA_MODEL },
  ];

  const active = providers.find(p => p.available) ?? null;
  return {
    available: !!active,
    provider: active?.provider ?? null,
    providers,
    model: active?.model ?? '',
  };
}

// ─── Unified JSON generation (Groq → Gemini → Ollama) ─────────────────────────

export async function callAIForJSON(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<string | null> {
  // 1. Groq: fastest free tier
  if (getGroqClient()) {
    const result = await callGroqForJSON(systemPrompt, userPrompt, maxTokens);
    if (result) return result;
  }

  // 2. Gemini: best Vietnamese support
  if (getGeminiKey()) {
    const result = await callGeminiForJSON(systemPrompt, userPrompt, maxTokens);
    if (result) return result;
  }

  // 3. Ollama: local fallback
  if (await isOllamaAvailable()) {
    return callOllamaForJSON(systemPrompt, userPrompt, maxTokens);
  }

  return null;
}

export async function isAnyAIAvailable(): Promise<boolean> {
  if (getGroqClient()) return true;
  if (getGeminiKey()) return true;
  return isOllamaAvailable();
}

export function getActiveProviderName(): string {
  if (getGroqClient()) return `Groq · ${GROQ_MODEL}`;
  if (getGeminiKey()) return `Gemini · ${GEMINI_MODEL}`;
  return `Ollama · ${OLLAMA_MODEL}`;
}

// ─── Unified chat (Groq → Gemini → Ollama) ────────────────────────────────────

export async function aiChatOnce(messages: ChatMessage[]): Promise<string> {
  if (getGroqClient()) {
    try { return await groqChat(messages); } catch { /* fallback */ }
  }
  if (getGeminiKey()) {
    try { return await geminiChat(messages); } catch { /* fallback */ }
  }
  return ollamaChat(messages);
}

export async function* aiChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (getGroqClient()) {
    try {
      yield* groqStream(messages);
      return;
    } catch { /* fallback */ }
  }
  if (getGeminiKey()) {
    try {
      yield* geminiStream(messages);
      return;
    } catch { /* fallback */ }
  }
  yield* ollamaStream(messages);
}
