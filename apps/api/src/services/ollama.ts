const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const SYSTEM_PROMPTS: Record<string, string> = {
  math: 'Bạn là gia sư toán học AI. Luôn trả lời bằng tiếng Việt, giải thích từng bước rõ ràng. Khi giải toán trình bày các bước ngắn gọn. Không dùng markdown phức tạp.',
  language: 'Bạn là gia sư ngoại ngữ AI. Giải thích ngữ pháp và từ vựng bằng tiếng Việt, đưa ví dụ thực tế. Ngắn gọn, dễ hiểu.',
  viet: 'Bạn là gia sư Tiếng Việt AI. Giải thích từ vựng, ngữ pháp, thành ngữ, tục ngữ tiếng Việt bằng ngôn ngữ đơn giản, phù hợp học sinh.',
  general: 'Bạn là trợ lý học tập AI thông minh. Luôn trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu.',
};

export async function ollamaChat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json() as { message?: { content: string } };
  return data.message?.content ?? '';
}

export async function* ollamaStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: true }),
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
      } catch { /* skip malformed */ }
    }
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
