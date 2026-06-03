export interface StreamChatOptions {
  messages: { role: string; content: string }[];
  subject: string;
  mode: string;
  token: string | null;
  signal?: AbortSignal;
}

export async function fetchChatStream(opts: StreamChatOptions): Promise<Response> {
  return fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ messages: opts.messages, subject: opts.subject, mode: opts.mode }),
    signal: opts.signal,
  });
}
