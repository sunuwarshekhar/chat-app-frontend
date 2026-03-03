import { useState, useRef, useEffect, useCallback } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string | null;
  onTyping?: (event: string, payload: { conversationId: string }) => void;
}

const TYPING_DEBOUNCE_MS = 3000;

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  conversationId,
  onTyping,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingStartRef = useRef<number>(0);

  const emitTypingStart = useCallback(() => {
    if (!conversationId || !onTyping || disabled) return;
    const now = Date.now();
    if (now - lastTypingStartRef.current > 200) {
      onTyping('typing_start', { conversationId });
      lastTypingStartRef.current = now;
    }
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      onTyping('typing_stop', { conversationId });
      typingStopRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, [conversationId, onTyping, disabled]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (typingStopRef.current) {
      clearTimeout(typingStopRef.current);
      typingStopRef.current = null;
      if (conversationId && onTyping)
        onTyping('typing_stop', { conversationId });
    }
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else {
      emitTypingStart();
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
    };
  }, []);

  return (
    <div className='message-input-wrap'>
      <textarea
        ref={inputRef}
        className='message-input'
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          emitTypingStart();
        }}
        onKeyDown={handleKeyDown}
        onFocus={emitTypingStart}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label='Message'
      />
      <button
        type='button'
        className='message-send'
        onClick={submit}
        disabled={disabled || !text.trim()}
        aria-label='Send'
      >
        Send
      </button>
    </div>
  );
}
