import { apiFetch } from './client';
import type { Conversation } from '../types';

export interface CreateConversationBody {
  type: 'dm' | 'group';
  participantUserId?: string;
  name?: string;
  memberIds?: string[];
}

export async function getConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>('/api/conversations');
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${id}`);
}

export async function createConversation(
  body: CreateConversationBody,
): Promise<Conversation> {
  return apiFetch<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
