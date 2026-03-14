import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { ConversationList } from '../components/ConversationList';
import { NewChatModal } from '../components/NewChatModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { IncomingCallModal } from '../components/IncomingCallModal';
import { OutgoingCallModal } from '../components/OutgoingCallModal';
import { ActiveCallView } from '../components/ActiveCallView';
import { PhoneIcon, VideoCallIcon } from '../components/CallIcons';
import { useWebRTC } from '../hooks/useWebRTC';
import * as conversationsApi from '../api/conversations';
import * as messagesApi from '../api/messages';
import type { Conversation, ChatMessage } from '../types';

function formatLastSeen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString();
}

export function Chat() {
  const { user, logout } = useAuth();
  const { socket, connected, emit } = useSocket();
  const {
    callState,
    callType,
    incomingCall,
    remotePeerName,
    callDurationSeconds,
    outgoingElapsedSeconds,
    isMuted,
    isVideoOff,
    localVideoRef,
    remoteStream,
    remoteTrackCount,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({ socket });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenAtByUser, setLastSeenAtByUser] = useState<
    Record<string, string>
  >({});
  const [typingInConversation, setTypingInConversation] = useState<
    Record<string, { userId: string; displayName: string }[]>
  >({});

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const list = await conversationsApi.getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (mounted) void loadConversations();
    return () => {
      mounted = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId || !user) return;
    let mounted = true;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const list = await messagesApi.getMessages(selectedId, { limit: 50 });
        if (mounted) setMessages(list);
      } catch (err) {
        console.error('Failed to load messages', err);
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchMessages();
    return () => {
      mounted = false;
    };
  }, [selectedId, user]);

  useEffect(() => {
    if (!socket || !selectedId) return;
    emit('join_conversation', { conversationId: selectedId });
    return () => {
      emit('leave_conversation', { conversationId: selectedId });
    };
  }, [socket, selectedId, emit]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      if (msg.conversationId === selectedId) {
        setMessages((prev) => [...prev, msg]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? {
                ...c,
                lastMessage: {
                  id: msg.id,
                  text: msg.text,
                  createdAt: msg.createdAt,
                  senderId: msg.senderId,
                },
              }
            : c,
        ),
      );
    };
    socket.on('new_message', handler);
    return () => {
      socket.off('new_message', handler);
    };
  }, [socket, selectedId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      if (msg.conversationId === selectedId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId && c.lastMessage?.id === msg.id
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  text: msg.text,
                  createdAt: msg.createdAt,
                },
              }
            : c,
        ),
      );
    };
    socket.on('message_edited', handler);
    return () => {
      socket.off('message_edited', handler);
    };
  }, [socket, selectedId]);

  useEffect(() => {
    if (!socket) return;
    const onOnline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set(prev).add(data.userId));
    };
    const onOffline = (data: { userId: string; lastSeenAt: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      setLastSeenAtByUser((prev) => ({
        ...prev,
        [data.userId]: data.lastSeenAt,
      }));
    };
    const onOnlineMembers = (data: {
      conversationId: string;
      userIds: string[];
    }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        data.userIds.forEach((id) => next.add(id));
        return next;
      });
    };
    const onTyping = (data: {
      userId: string;
      displayName: string;
      conversationId: string;
    }) => {
      if (data.userId === user?.id) return;
      setTypingInConversation((prev) => {
        const list = prev[data.conversationId] ?? [];
        if (list.some((t) => t.userId === data.userId)) return prev;
        return {
          ...prev,
          [data.conversationId]: [
            ...list,
            { userId: data.userId, displayName: data.displayName },
          ],
        };
      });
    };
    const onStoppedTyping = (data: {
      userId: string;
      conversationId: string;
    }) => {
      setTypingInConversation((prev) => ({
        ...prev,
        [data.conversationId]: (prev[data.conversationId] ?? []).filter(
          (t) => t.userId !== data.userId,
        ),
      }));
    };
    socket.on('presence_online', onOnline);
    socket.on('presence_offline', onOffline);
    socket.on('online_members', onOnlineMembers);
    socket.on('user_typing', onTyping);
    socket.on('user_stopped_typing', onStoppedTyping);
    return () => {
      socket.off('presence_online', onOnline);
      socket.off('presence_offline', onOffline);
      socket.off('online_members', onOnlineMembers);
      socket.off('user_typing', onTyping);
      socket.off('user_stopped_typing', onStoppedTyping);
    };
  }, [socket, user?.id]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!selectedId) return;
      emit('send_message', {
        conversationId: selectedId,
        text,
      });
    },
    [selectedId, emit],
  );

  const editMessage = useCallback(
    (messageId: string, text: string) => {
      if (!selectedId) return;
      emit('edit_message', {
        messageId,
        conversationId: selectedId,
        text,
      });
    },
    [selectedId, emit],
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className='chat-page'>
      <header className='chat-header'>
        <div className='chat-header-title'>
          <h1>Chat</h1>
          <span
            className={`chat-status ${connected ? 'connected' : 'disconnected'}`}
          >
            {connected ? 'Connected' : 'Connecting…'}
          </span>
        </div>
        <div className='chat-header-user'>
          <span className='chat-user-name'>
            {user?.displayName ?? user?.email}
          </span>
          <button type='button' className='chat-logout' onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className='chat-layout'>
        <aside className='chat-sidebar'>
          <div className='chat-sidebar-header'>
            <button
              type='button'
              className='new-chat-btn'
              onClick={() => setNewChatOpen(true)}
            >
              New chat
            </button>
            <button
              type='button'
              className='new-group-btn'
              onClick={() => setNewGroupOpen(true)}
            >
              New group
            </button>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            currentUserId={user?.id ?? ''}
            onlineUserIds={onlineUserIds}
          />
          <NewChatModal
            isOpen={newChatOpen}
            onClose={() => setNewChatOpen(false)}
            onConversationCreated={(id) => {
              setSelectedId(id);
              void loadConversations();
            }}
            currentUserId={user?.id ?? ''}
          />
          <CreateGroupModal
            isOpen={newGroupOpen}
            onClose={() => setNewGroupOpen(false)}
            onConversationCreated={(id) => {
              setSelectedId(id);
              void loadConversations();
            }}
            currentUserId={user?.id ?? ''}
          />
        </aside>
        <div className='chat-main'>
          {!selectedId ? (
            <div className='chat-placeholder'>
              Select a conversation or start a new chat.
            </div>
          ) : (
            <>
              <div className='chat-main-scroll'>
                {selectedConversation && (
                  <>
                    <div className='chat-conversation-header'>
                      <span className='chat-conversation-header-title'>
                        {selectedConversation.type === 'group' &&
                        selectedConversation.name
                          ? selectedConversation.name
                          : (() => {
                              const other = selectedConversation.members?.find(
                                (m) => m.userId !== user?.id,
                              );
                              const name =
                                other?.displayName ??
                                other?.user?.displayName ??
                                other?.user?.email ??
                                (other as { email?: string })?.email;
                              return name?.trim() || 'Unknown';
                            })()}
                      </span>
                      {selectedConversation.type === 'dm' &&
                        (() => {
                          const other = selectedConversation.members?.find(
                            (m) => m.userId !== user?.id,
                          );
                          const otherId = other?.userId;
                          if (!otherId) return null;
                          const online = onlineUserIds.has(otherId);
                          const lastSeen =
                            lastSeenAtByUser[otherId] ?? other?.lastSeenAt;
                          return (
                            <span className='chat-conversation-header-status'>
                              {online ? (
                                <span className='presence-online'>
                                  <span className='presence-dot' /> Online
                                </span>
                              ) : lastSeen ? (
                                <span className='presence-last-seen'>
                                  Last seen {formatLastSeen(lastSeen)}
                                </span>
                              ) : null}
                            </span>
                          );
                        })()}
                      {selectedConversation.type === 'dm' &&
                        callState === 'idle' && (
                          <div className='header-call-buttons'>
                            <button
                              type='button'
                              className='header-call-btn'
                              title='Voice call'
                              onClick={() => {
                                const other =
                                  selectedConversation.members?.find(
                                    (m) => m.userId !== user?.id,
                                  );
                                const name =
                                  other?.displayName ??
                                  other?.user?.displayName ??
                                  other?.user?.email;
                                void startCall(
                                  selectedId!,
                                  'audio',
                                  name ?? undefined,
                                );
                              }}
                            >
                              <PhoneIcon size={20} />
                            </button>
                            <button
                              type='button'
                              className='header-call-btn'
                              title='Video call'
                              onClick={() => {
                                const other =
                                  selectedConversation.members?.find(
                                    (m) => m.userId !== user?.id,
                                  );
                                const name =
                                  other?.displayName ??
                                  other?.user?.displayName ??
                                  other?.user?.email;
                                void startCall(
                                  selectedId!,
                                  'video',
                                  name ?? undefined,
                                );
                              }}
                            >
                              <VideoCallIcon size={20} />
                            </button>
                          </div>
                        )}
                    </div>
                  </>
                )}
                {loading ? (
                  <div className='chat-loading'>Loading messages…</div>
                ) : (
                  <MessageList
                    messages={messages}
                    currentUserId={user?.id ?? ''}
                    onEditMessage={editMessage}
                  />
                )}
                {selectedId && typingInConversation[selectedId]?.length > 0 && (
                  <div className='chat-typing-status'>
                    {typingInConversation[selectedId]
                      .map((t) => t.displayName)
                      .join(', ')}{' '}
                    typing…
                  </div>
                )}
              </div>
              <div className='chat-main-input'>
                <MessageInput
                  onSend={sendMessage}
                  disabled={!connected}
                  placeholder={
                    selectedId ? 'Type a message…' : 'Select a conversation'
                  }
                  conversationId={selectedId}
                  onTyping={emit}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Call Modals ───────────────────────────── */}
      {callState === 'incoming' && incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callType={incomingCall.type}
          onAccept={() => void acceptCall()}
          onReject={rejectCall}
        />
      )}
      {callState === 'outgoing' && (
        <OutgoingCallModal
          calleeName={remotePeerName}
          callType={callType}
          localVideoRef={localVideoRef}
          outgoingElapsedSeconds={outgoingElapsedSeconds}
          onCancel={endCall}
        />
      )}
      {callState === 'active' && (
        <ActiveCallView
          calleeName={remotePeerName}
          callType={callType}
          durationSeconds={callDurationSeconds}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          localVideoRef={localVideoRef}
          remoteStream={remoteStream}
          remoteTrackCount={remoteTrackCount}
          onMute={toggleMute}
          onVideoToggle={toggleVideo}
          onHangup={endCall}
        />
      )}
    </div>
  );
}
