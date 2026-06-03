import type { RefObject } from 'react';
import { Send, X, Mic, MicOff, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODE_HINTS } from './constants';
import type { Mode } from './types';

interface ChatInputProps {
  input: string;
  mode: Mode;
  streaming: boolean;
  aiOk: boolean | null;
  micListening: boolean;
  micAvailable: boolean;
  color: string;
  hasMessages: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onMic: () => void;
  onClearHistory: () => void;
}

export function ChatInput({
  input, mode, streaming, aiOk, micListening, micAvailable, color,
  hasMessages, inputRef, onInputChange, onSend, onStop, onMic, onClearHistory,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 border-t border-gray-100 shrink-0">
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={MODE_HINTS[mode]}
          disabled={streaming || aiOk === false}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 max-h-24 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />
        <div className="flex flex-col gap-1 shrink-0">
          {micAvailable && !streaming && (
            <button
              onClick={onMic}
              className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                micListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200',
              )}
            >
              {micListening
                ? <MicOff className="h-4 w-4 text-white" />
                : <Mic className="h-4 w-4 text-gray-600" />}
            </button>
          )}
          {streaming ? (
            <button
              onClick={onStop}
              className="h-9 w-9 rounded-xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() || aiOk === false}
              className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center transition-colors bg-gradient-to-br',
                color,
                'disabled:opacity-40 hover:opacity-90',
              )}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {hasMessages && (
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1.5 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />Xoá hội thoại
        </button>
      )}
    </div>
  );
}
