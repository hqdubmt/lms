import { Bot, Minimize2, Maximize2, X, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  label: string;
  color: string;
  minimized: boolean;
  showBrain: boolean;
  aiOk: boolean | null;
  aiLabel: string;
  onToggleMinimize: () => void;
  onToggleBrain: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

export function ChatHeader({
  label, color, minimized, showBrain, aiOk, aiLabel,
  onToggleMinimize, onToggleBrain, onClose,
}: ChatHeaderProps) {
  return (
    <div
      className={cn('flex items-center gap-2 px-4 py-3 rounded-t-2xl shrink-0 cursor-pointer bg-gradient-to-r', color)}
      onClick={onToggleMinimize}
    >
      <Bot className="h-5 w-5 text-white shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">AI Trợ lý · {label}</div>
        {!minimized && aiOk !== null && (
          <div className="text-xs text-white/70">{aiOk ? `${aiLabel} · Sẵn sàng` : 'AI không khả dụng'}</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {!minimized && (
          <button
            onClick={onToggleBrain}
            className={cn(
              'h-6 w-6 rounded-lg flex items-center justify-center transition-colors',
              showBrain ? 'bg-white/30 text-white' : 'hover:bg-white/20 text-white/80 hover:text-white',
            )}
            title="Tiến trình học tập"
          >
            <Brain className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onToggleMinimize(); }}
          className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-lg hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
