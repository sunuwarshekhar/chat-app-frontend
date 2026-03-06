export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  displayName: string;
  createdAt: string;
  updatedAt?: string;
  /** @deprecated use createdAt */
  timestamp?: string;
}
