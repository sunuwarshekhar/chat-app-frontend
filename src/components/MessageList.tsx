import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

function messageWasEdited(msg: ChatMessage): boolean {
  if (!msg.updatedAt) return false;
  const created = new Date(msg.createdAt).getTime();
  const updated = new Date(msg.updatedAt).getTime();
  return updated - created > 1000;
}

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onEditMessage?: (messageId: string, text: string) => void;
}

export function MessageList({
  messages,
  currentUserId = '',
  onEditMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditDraft(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const submitEdit = () => {
    const trimmed = editDraft.trim();
    if (editingId && trimmed && onEditMessage) {
      onEditMessage(editingId, trimmed);
      setEditingId(null);
      setEditDraft('');
    }
  };

  const handleMessageKeyDown =
    (msg: ChatMessage) => (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startEdit(msg);
      }
    };

  return (
    <div className='message-list'>
      {messages.length === 0 ? (
        <div className='message-list-empty'>No messages yet. Say hello!</div>
      ) : (
        <ul className='message-list-inner'>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isEditing = editingId === msg.id;
            const showEditedLabel = isMe && messageWasEdited(msg);
            return (
              <li
                key={msg.id}
                className={`message-item ${isMe ? 'message-item--sent' : 'message-item--received'}`}
              >
                {!isMe && (
                  <span className='message-sender'>{msg.displayName}</span>
                )}
                {isEditing ? (
                  <div className='message-edit'>
                    <textarea
                      className='message-edit-input'
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitEdit();
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      rows={Math.min(
                        3,
                        Math.max(1, editDraft.split('\n').length),
                      )}
                    />
                    <div className='message-edit-actions'>
                      <button
                        type='button'
                        className='message-edit-cancel'
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type='button'
                        className='message-edit-save'
                        onClick={submitEdit}
                        disabled={!editDraft.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className='message-text'
                      role={isMe && onEditMessage ? 'button' : undefined}
                      tabIndex={isMe && onEditMessage ? 0 : undefined}
                      onClick={
                        isMe && onEditMessage ? () => startEdit(msg) : undefined
                      }
                      onKeyDown={
                        isMe && onEditMessage
                          ? handleMessageKeyDown(msg)
                          : undefined
                      }
                    >
                      {msg.text}
                    </span>
                    {showEditedLabel && (
                      <span className='message-edited-label'> (edited)</span>
                    )}
                  </>
                )}
                {!isEditing && (
                  <span className='message-time'>
                    {new Date(
                      msg.createdAt ??
                        (msg as { timestamp?: string }).timestamp ??
                        0,
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
