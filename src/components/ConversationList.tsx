import type { Conversation } from '../types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentUserId: string;
  onlineUserIds?: Set<string>;
}

function getConversationTitle(
  conv: Conversation,
  currentUserId: string,
): string {
  if (conv.type === 'group' && conv.name) return conv.name;
  const other = conv.members?.find((m) => m.userId !== currentUserId);
  // List API returns flat members { userId, displayName, email, role }; GET :id returns nested member.user
  const name =
    other?.displayName ??
    other?.user?.displayName ??
    other?.user?.email ??
    (other as { email?: string })?.email;
  return name?.trim() || 'Unknown';
}

function isConversationOnline(
  conv: Conversation,
  currentUserId: string,
  onlineUserIds: Set<string>,
): boolean {
  if (!onlineUserIds.size) return false;
  const others = conv.members?.filter((m) => m.userId !== currentUserId) ?? [];
  return others.some((m) => onlineUserIds.has(m.userId));
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  onlineUserIds = new Set(),
}: ConversationListProps) {
  return (
    <ul className='conversation-list'>
      {conversations.map((conv) => {
        const title = getConversationTitle(conv, currentUserId);
        const last = conv.lastMessage;
        const isSelected = conv.id === selectedId;
        const isOnline = isConversationOnline(
          conv,
          currentUserId,
          onlineUserIds,
        );
        return (
          <li key={conv.id}>
            <button
              type='button'
              className={`conversation-list-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className='conversation-list-item-row'>
                <span
                  className={`conversation-list-item-dot ${isOnline ? 'online' : ''}`}
                />
                <div className='conversation-list-item-title'>{title}</div>
              </div>
              {last && (
                <div className='conversation-list-item-preview'>
                  {last.text.length > 40
                    ? `${last.text.slice(0, 40)}…`
                    : last.text}
                </div>
              )}
            </button>
          </li>
        );
      })}
      {conversations.length === 0 && (
        <li className='conversation-list-empty'>
          No conversations yet. Create a DM or group from the header.
        </li>
      )}
    </ul>
  );
}
