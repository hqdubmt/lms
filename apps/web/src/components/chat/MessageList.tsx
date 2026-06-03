import type { RefObject } from 'react';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import type { Message, Subject, Mode } from './types';
import { MODE_HINTS } from './constants';

interface MessageListProps {
  messages: Message[];
  streaming: boolean;
  subject: Subject;
  mode: Mode;
  avatarColor: string;
  ttsLang: string;
  historyLoading: boolean;
  label: string;
  color: string;
  bottomRef: RefObject<HTMLDivElement>;
  onSendMessage: (text: string) => void;
  onSetInput: (text: string) => void;
  onRetry: () => void;
}

export function MessageList({
  messages, streaming, subject, mode, avatarColor, ttsLang,
  historyLoading, label, color, bottomRef,
  onSendMessage, onSetInput, onRetry,
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
      {messages.length === 0 ? (
        <EmptyState
          label={label}
          color={color}
          hint={MODE_HINTS[mode]}
          subject={subject}
          historyLoading={historyLoading}
          onSetInput={onSetInput}
        />
      ) : (
        messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            isLast={i === messages.length - 1}
            streaming={streaming}
            avatarColor={avatarColor}
            ttsLang={ttsLang}
            onSendMessage={onSendMessage}
            onRetry={onRetry}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
