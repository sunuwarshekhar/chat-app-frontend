import { useState, useEffect } from 'react';
import * as usersApi from '../api/users';
import * as conversationsApi from '../api/conversations';
import type { User } from '../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  currentUserId: string;
}

export function NewChatModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
}: NewChatModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    usersApi
      .getUsers({ limit: 50, search: search || undefined })
      .then((list) => setUsers(list.filter((u) => u.id !== currentUserId)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [isOpen, currentUserId, search]);

  const startChat = async (user: User) => {
    setCreating(true);
    try {
      const conv = await conversationsApi.createConversation({
        type: 'dm',
        participantUserId: user.id,
      });
      onConversationCreated(conv.id);
      onClose();
    } catch (err) {
      console.error('Failed to start chat', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose} role='presentation'>
      <div
        className='modal-content new-chat-modal'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
      >
        <div className='modal-header'>
          <h2>New chat</h2>
          <button
            type='button'
            className='modal-close'
            onClick={onClose}
            aria-label='Close'
          >
            ×
          </button>
        </div>
        <input
          type='text'
          className='new-chat-search'
          placeholder='Search users…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className='new-chat-list'>
          {loading ? (
            <div className='new-chat-loading'>Loading users…</div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                type='button'
                className='new-chat-user'
                onClick={() => startChat(u)}
                disabled={creating}
              >
                <span className='new-chat-user-name'>
                  {u.displayName ?? u.email}
                </span>
                {u.displayName && (
                  <span className='new-chat-user-email'>{u.email}</span>
                )}
              </button>
            ))
          )}
          {!loading && users.length === 0 && (
            <div className='new-chat-empty'>No other users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
