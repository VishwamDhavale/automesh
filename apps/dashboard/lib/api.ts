const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = { ...options.headers };
  // Only add Content-Type if we have a body or it's not explicitly removed
  if (options.body && !headers['Content-Type' as keyof typeof headers]) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((error as any).error ?? `API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── API Methods ────────────────────────────────────────────────

export const api = {
  // Workflows
  getWorkflows: () => apiFetch<any[]>('/api/workflows'),
  getWorkflow: (id: string) => apiFetch<any>(`/api/workflows/${id}`),
  createWorkflow: (yaml: string, name?: string) =>
    apiFetch<any>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({ yaml, name }),
    }),
  deleteWorkflow: (id: string) =>
    apiFetch<any>(`/api/workflows/${id}`, { method: 'DELETE' }),
  pauseWorkflow: (id: string) =>
    apiFetch<{ id: string; status: string }>(`/api/workflows/${id}/pause`, { method: 'POST' }),
  resumeWorkflow: (id: string) =>
    apiFetch<{ id: string; status: string }>(`/api/workflows/${id}/resume`, { method: 'POST' }),
  triggerWorkflow: (id: string, data?: Record<string, unknown>) =>
    apiFetch<any>(`/api/workflows/${id}/trigger`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  // Runs
  getRuns: (workflowId?: string) =>
    apiFetch<any[]>(`/api/runs${workflowId ? `?workflowId=${workflowId}` : ''}`),
  getRun: (id: string) => apiFetch<any>(`/api/runs/${id}`),
  cancelRun: (id: string) =>
    apiFetch<{ success: boolean; status: string }>(`/api/runs/${id}/cancel`, {
      method: 'POST',
    }),

  // Events
  getEvents: () => apiFetch<any[]>('/api/events'),

  // AI
  generateWorkflow: (prompt: string) =>
    apiFetch<{ yaml: string; model: string }>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  aiChat: (message: string, sessionId?: string) =>
    apiFetch<{ sessionId: string; message: string; model: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
  getAiChatHistory: (sessionId: string) =>
    apiFetch<{ history: { role: string; content: string }[] }>(`/api/ai/chat/${sessionId}`),

  // Marketplace
  getIntegrations: () => apiFetch<any[]>('/api/marketplace/integrations'),
  getPlugins: () => apiFetch<any[]>('/api/marketplace/plugins'),

  // Health
  health: () => apiFetch<{ status: string }>('/api/health'),
};
