import { apiFetch } from './client';
import type { ChatMessage } from '../types';

export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  return apiFetch<ChatMessage[]>(
    `/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
  );
}
