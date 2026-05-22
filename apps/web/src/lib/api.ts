// Dùng relative URL /api → Next.js rewrite proxy tới API server (tránh CORS và cross-origin)
const API_URL = '/api';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken() {
    return this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      // Chỉ set Content-Type khi có body để tránh Fastify parse body rỗng → 400
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401) {
      // Try refresh
      const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();
        this.accessToken = accessToken;
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${accessToken}; path=/; samesite=lax; max-age=900`;
        }
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retry = await fetch(`${this.baseUrl}${path}`, { ...options, headers, credentials: 'include' });
        if (!retry.ok) throw new Error(await retry.text());
        return retry.json();
      }
      this.accessToken = null;
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }

    if (res.status === 204) return null as T;
    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  patch<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST', body: formData, headers, credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload thất bại');
    }
    return res.json();
  }
}

export const api = new ApiClient(API_URL);
