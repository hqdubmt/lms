import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_ACTIONS } from './constants';
import type { Mode, Subject } from './types';

interface EmptyStateProps {
  label: string;
  color: string;
  hint: string;
  subject: Subject;
  historyLoading: boolean;
  onSetInput: (text: string) => void;
  onSetMode: (mode: Mode) => void;
}

export function EmptyState({ label, color, hint, historyLoading, onSetInput, onSetMode }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className={cn('h-14 w-14 rounded-2xl mb-3 flex items-center justify-center bg-gradient-to-br', color)}>
        <Bot className="h-7 w-7 text-white" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">AI Gia Sư · {label}</p>
      {historyLoading
        ? <p className="text-xs text-gray-400 mb-3">Đang tải lịch sử...</p>
        : <p className="text-xs text-gray-400 mb-3">{hint}</p>
      }
      {!historyLoading && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-1">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => { onSetMode(action.mode); onSetInput(action.prompt); }}
                className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:border-primary hover:text-primary rounded-full px-2.5 py-1 transition-colors shadow-sm"
              >
                <Icon className="h-3 w-3" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
