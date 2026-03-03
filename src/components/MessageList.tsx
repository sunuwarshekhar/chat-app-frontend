import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
}

export function MessageList({
  messages,
  currentUserId = '',
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className='message-list'>
      {messages.length === 0 ? (
        <div className='message-list-empty'>No messages yet. Say hello!</div>
      ) : (
        <ul className='message-list-inner'>
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <li
                key={msg.id}
                className={`message-item ${isMe ? 'message-item--sent' : 'message-item--received'}`}
              >
                {!isMe && (
                  <span className='message-sender'>{msg.displayName}</span>
                )}
                <span className='message-text'>{msg.text}</span>
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
              </li>
            );
          })}
        </ul>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
