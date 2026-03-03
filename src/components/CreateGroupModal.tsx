import { useState, useEffect } from 'react';
import * as usersApi from '../api/users';
import * as conversationsApi from '../api/conversations';
import type { User } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  currentUserId: string;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onConversationCreated,
  currentUserId,
}: CreateGroupModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const conv = await conversationsApi.createConversation({
        type: 'group',
        name,
        memberIds: Array.from(selectedIds),
      });
      onConversationCreated(conv.id);
      onClose();
      setGroupName('');
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose} role='presentation'>
      <div
        className='modal-content new-chat-modal create-group-modal'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
      >
        <div className='modal-header'>
          <h2>New group</h2>
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
          className='new-chat-search create-group-name'
          placeholder='Group name'
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          aria-label='Group name'
        />
        <input
          type='text'
          className='new-chat-search'
          placeholder='Search users to add…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className='new-chat-list create-group-list'>
          {loading ? (
            <div className='new-chat-loading'>Loading users…</div>
          ) : (
            users.map((u) => (
              <label key={u.id} className='new-chat-user create-group-user'>
                <input
                  type='checkbox'
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className='create-group-checkbox'
                />
                <span className='new-chat-user-name'>
                  {u.displayName ?? u.email}
                </span>
                {u.displayName && (
                  <span className='new-chat-user-email'>{u.email}</span>
                )}
              </label>
            ))
          )}
          {!loading && users.length === 0 && (
            <div className='new-chat-empty'>No other users found.</div>
          )}
        </div>
        <div className='modal-footer'>
          <button type='button' className='modal-cancel' onClick={onClose}>
            Cancel
          </button>
          <button
            type='button'
            className='modal-submit'
            onClick={createGroup}
            disabled={creating || !groupName.trim() || selectedIds.size === 0}
          >
            {creating
              ? 'Creating…'
              : `Create group${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
