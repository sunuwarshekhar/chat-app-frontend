import type { User } from './user';

export type ConversationType = 'dm' | 'group';

export interface ConversationMember {
  id?: string;
  conversationId?: string;
  userId: string;
  role: string;
  joinedAt?: string;
  displayName?: string | null;
  email?: string;
  lastSeenAt?: string | null;
  user?: User;
}

export interface LastMessagePreview {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  createdById: string;
  createdAt: string;
  members?: ConversationMember[];
  lastMessage?: LastMessagePreview | null;
}
