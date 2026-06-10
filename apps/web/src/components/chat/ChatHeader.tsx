import { Bot, Minimize2, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  label: string;
  color: string;
  minimized: boolean;
  aiOk: boolean | null;
  aiLabel: string;
  streaming?: boolean;
  onToggleMinimize: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export function ChatHeader({
  label, color, minimized, aiOk, aiLabel, streaming = false,
  onToggleMinimize, onClose,
}: ChatHeaderProps) {
  return (
    <div className="shrink-0">
    <div
      className={cn('flex items-center gap-2 px-4 py-3 rounded-t-2xl cursor-pointer bg-gradient-to-r', color, minimized && 'rounded-b-2xl')}
      onClick={onToggleMinimize}
    >
      <Bot className={cn('h-5 w-5 text-white shrink-0', streaming && 'animate-pulse')} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">AI Gia Sư · {label}</div>
        {!minimized && (
          <div className="text-xs text-white/70">
            {streaming
              ? <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-1 w-1 rounded-full bg-white/80 animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s` }} />
                    ))}
                  </span>
                  Đang soạn câu trả lời...
                </span>
              : aiOk !== null
                ? aiOk ? `${aiLabel} · Sẵn sàng` : 'AI không khả dụng'
                : null}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
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

    {streaming && !minimized && (
      <div className="h-[2px] w-full bg-white/20 overflow-hidden relative">
        <div
          className="absolute h-full bg-white/80 rounded-full"
          style={{ width: '35%', animation: 'streambar 1.3s ease-in-out infinite' }}
        />
      </div>
    )}
    </div>
  );
}
