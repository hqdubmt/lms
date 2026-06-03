import { Bot, RefreshCw, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypingDots } from './TypingDots';
import { MessageContent } from './MessageContent';
import { CopyButton } from './CopyButton';
import { TtsButton } from './TtsButton';
import type { Message } from './types';

const LANG_INTENT_LABELS: Record<string, string> = {
  LANGUAGE_TRANSLATE:  'Dịch thuật',
  LANGUAGE_GRAMMAR:    'Ngữ pháp',
  LANGUAGE_VOCABULARY: 'Từ vựng',
  LANGUAGE_SPEAKING:   'Phát âm',
  LANGUAGE_WRITING:    'Viết',
  LANGUAGE_LISTENING:  'Luyện nghe',
};

interface MessageBubbleProps {
  msg: Message;
  isLast: boolean;
  streaming: boolean;
  avatarColor: string;
  ttsLang: string;
  onSendMessage: (text: string) => void;
  onRetry: () => void;
}

export function MessageBubble({
  msg, isLast, streaming, avatarColor, ttsLang, onSendMessage, onRetry,
}: MessageBubbleProps) {
  return (
    <div className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
      {msg.role === 'assistant' && (
        <div className={cn('h-7 w-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', avatarColor)}>
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-w-[82%]">
        <div className={cn(
          'px-3 py-2 rounded-2xl text-sm leading-relaxed',
          msg.role === 'user'
            ? 'bg-primary text-white rounded-br-sm'
            : msg.error
              ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
              : 'bg-gray-100 text-gray-800 rounded-bl-sm',
        )}>
          {msg.loading && !msg.content ? (
            <TypingDots />
          ) : msg.role === 'assistant' ? (
            <MessageContent content={msg.content} />
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {msg.role === 'assistant' && msg.langIntent && (
          <div className="px-1">
            <span className="text-xs bg-blue-50 text-blue-500 border border-blue-100 rounded-full px-2 py-0.5">
              {LANG_INTENT_LABELS[msg.langIntent] ?? msg.langIntent}
            </span>
          </div>
        )}

        {msg.role === 'assistant' && !msg.loading && msg.content && !msg.error && (
          <div className="flex items-center gap-0.5 px-1">
            <CopyButton text={msg.content} />
            <TtsButton text={msg.content} lang={ttsLang} />
          </div>
        )}

        {msg.error && isLast && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />Thử lại
          </button>
        )}

        {msg.role === 'assistant' && msg.activeAgents && msg.activeAgents.length > 0 && !msg.loading && (
          <div className="px-1 flex items-center gap-1 flex-wrap">
            <Users className="h-3 w-3 text-gray-300 shrink-0" />
            {msg.activeAgents.map(a => (
              <span key={a} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-1.5 py-0.5">{a}</span>
            ))}
          </div>
        )}

        {msg.validationWarnings && msg.validationWarnings.length > 0 && (
          <div className="px-1 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{msg.validationWarnings.includes('NO_STEPS') ? 'AI chưa trình bày đầy đủ các bước' : msg.validationWarnings.includes('ANSWER_MISSING') ? 'Chưa có điểm chấm' : 'Phản hồi ngắn'}</span>
          </div>
        )}

        {msg.sources && msg.sources.length > 0 && (
          <div className="px-1">
            <p className="text-xs text-gray-400 mb-1 font-medium">Nguồn tham khảo:</p>
            <div className="flex flex-wrap gap-1">
              {msg.sources.map((s, si) => (
                <span key={si} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                  ✓ {s.lesson}{s.topic ? ` · ${s.topic}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {msg.suggestions && msg.suggestions.length > 0 && !streaming && (
          <div className="px-1 flex flex-wrap gap-1">
            {msg.suggestions.map((s, si) => (
              <button
                key={si}
                onClick={() => onSendMessage(s)}
                disabled={streaming}
                className="text-xs bg-white border border-gray-200 hover:border-primary hover:text-primary rounded-full px-2.5 py-1 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
