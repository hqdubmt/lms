import { cn } from '@/lib/utils';
import { QUICK_ACTIONS } from './constants';
import type { Mode } from './types';

interface QuickActionsProps {
  onSetInput: (text: string) => void;
  onSetMode: (mode: Mode) => void;
}

export function QuickActions({ onSetInput, onSetMode }: QuickActionsProps) {
  return (
    <div className="flex gap-1.5 px-3 py-2 border-t border-gray-100 bg-gray-50 shrink-0 overflow-x-auto">
      {QUICK_ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => { onSetMode(action.mode); onSetInput(action.prompt); }}
            className={cn(
              'flex items-center gap-1 shrink-0 text-xs font-medium',
              'bg-white border border-gray-200 hover:border-primary hover:text-primary',
              'rounded-full px-2.5 py-1 transition-colors shadow-sm whitespace-nowrap',
            )}
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
