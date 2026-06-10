import { useRef, type RefObject } from 'react';
import { Send, X, Mic, MicOff, RotateCcw, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODE_HINTS } from './constants';
import type { Mode, Subject } from './types';

const SUBJECT_COMMANDS: Record<string, Subject> = {
  '/math':     'math',
  '/language': 'language',
  '/viet':     'viet',
  '/default':  'general',
};

const SUBJECT_LABELS: Record<Subject, string> = {
  math:     'Toán',
  language: 'Ngoại ngữ',
  viet:     'Tiếng Việt',
  general:  'Tổng quát',
};

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
  subjectOverride?: Subject | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onMic: () => void;
  onClearHistory: () => void;
  onSubjectOverride?: (subject: Subject | null) => void;
}

export function ChatInput({
  input, mode, streaming, aiOk, micListening, micAvailable, color,
  hasMessages, inputRef, subjectOverride, onInputChange, onSend, onStop,
  onMic, onClearHistory, onSubjectOverride,
}: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    const matched = SUBJECT_COMMANDS[trimmed];
    if (matched !== undefined) {
      onSubjectOverride?.(matched);
      onInputChange('');
      return;
    }
    onInputChange(value);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const prefix = input.trim() ? `${input.trim()} ` : '';
    onInputChange(`${prefix}[📎 ${file.name}] `);
    e.target.value = '';
    inputRef.current?.focus();
  };

  return (
    <div className="p-3 border-t border-gray-100 shrink-0">
      {subjectOverride && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full px-2 py-0.5 font-medium">
            Môn: {SUBJECT_LABELS[subjectOverride]}
          </span>
          <button
            onClick={() => onSubjectOverride?.(null)}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            title="Trở về môn mặc định"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={MODE_HINTS[mode]}
          disabled={streaming || aiOk === false}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 max-h-24 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />
        <div className="flex flex-col gap-1 shrink-0">
          {!streaming && (
            <button
              onClick={() => fileRef.current?.click()}
              className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              title="Đính kèm tệp"
            >
              <Paperclip className="h-4 w-4 text-gray-600" />
            </button>
          )}
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

      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
    </div>
  );
}
