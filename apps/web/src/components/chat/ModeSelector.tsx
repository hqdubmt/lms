import { cn } from '@/lib/utils';
import { MODES } from './constants';
import type { Mode } from './types';

interface ModeSelectorProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
      {MODES.map(m => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
              active
                ? 'text-primary border-b-2 border-primary bg-white'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
