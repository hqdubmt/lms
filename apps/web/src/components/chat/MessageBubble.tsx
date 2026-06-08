import { Bot, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypingDots } from './TypingDots';
import { MessageContent } from './MessageContent';
import { CopyButton } from './CopyButton';
import { TtsButton } from './TtsButton';
import { StreamActivityStrip } from './StreamActivityStrip';
import { FeedbackButtons } from './FeedbackButtons';
import type { Message } from './types';

interface MessageBubbleProps {
  msg: Message;
  isLast: boolean;
  streaming: boolean;
  avatarColor: string;
  ttsLang: string;
  onSendMessage: (text: string) => void;
  onRetry: () => void;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({
  msg, isLast, streaming, avatarColor, ttsLang, onSendMessage, onRetry,
}: MessageBubbleProps) {
  const isCurrentlyStreaming = isLast && streaming && msg.role === 'assistant' && !msg.error;
  const streamDone = msg.role === 'assistant' && !msg.loading && !streaming && !!msg.content && !msg.error;
  // Show activity strip as soon as metadata is available (during or after streaming)
  const hasActivityData = msg.role === 'assistant' && !msg.error &&
    (!!msg.provider || (msg.activeAgents?.length ?? 0) > 0 || (msg.sources?.length ?? 0) > 0 || !!msg.langIntent);

  return (
    <div className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
      {msg.role === 'assistant' && (
        <div className={cn('h-7 w-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', avatarColor)}>
          <Bot className={cn('h-4 w-4 text-white', isCurrentlyStreaming && 'animate-pulse')} />
        </div>
      )}

      <div className="flex flex-col gap-1 max-w-[82%]">
        {/* Main bubble */}
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
            <>
              <MessageContent content={msg.content} />
              {/* Blinking cursor while streaming */}
              {isCurrentlyStreaming && (
                <span className="inline-block h-[1em] w-[2px] bg-gray-500 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {/* Streaming indicator — only show if no metadata yet */}
        {isCurrentlyStreaming && !hasActivityData && (
          <div className="flex items-center gap-1 px-1">
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="h-1 w-1 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
            <span className="text-[10px] text-muted-foreground">Đang soạn...</span>
          </div>
        )}

        {/* ── Stream Activity Strip — live during stream + after done ── */}
        {hasActivityData && (
          <StreamActivityStrip
            provider={msg.provider}
            activeAgents={msg.activeAgents}
            sources={msg.sources}
            langIntent={msg.langIntent}
            validationWarnings={msg.validationWarnings}
            latencyMs={msg.latencyMs}
            timestamp={msg.timestamp}
            isStreaming={isCurrentlyStreaming}
          />
        )}

        {/* Copy + TTS + Feedback actions */}
        {streamDone && (
          <div className="flex items-center gap-0.5 px-1">
            <CopyButton text={msg.content} />
            <TtsButton text={msg.content} lang={ttsLang} />
            {msg.id && (
              <FeedbackButtons
                messageId={msg.id}
                subject={msg.subject}
                mode={msg.mode}
                provider={msg.provider}
              />
            )}
          </div>
        )}

        {/* User message timestamp */}
        {msg.role === 'user' && msg.timestamp && (
          <div className="flex justify-end px-1">
            <span className="text-[10px] text-gray-400">{fmtTime(msg.timestamp)}</span>
          </div>
        )}

        {/* Retry on error */}
        {msg.error && isLast && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />Thử lại
          </button>
        )}

        {/* Suggestion pills */}
        {msg.suggestions && msg.suggestions.length > 0 && !streaming && (
          <div className="px-1 flex flex-wrap gap-1 mt-0.5">
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
