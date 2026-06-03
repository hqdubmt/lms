import { LANG_QUICK_ACTIONS } from './constants';

interface LangQuickBarProps {
  onSetInput: (text: string) => void;
}

export function LangQuickBar({ onSetInput }: LangQuickBarProps) {
  return (
    <div className="flex gap-1.5 flex-wrap px-3 py-2 border-t border-gray-50 bg-gray-50/50 shrink-0">
      {LANG_QUICK_ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onSetInput(action.prompt)}
            className="flex items-center gap-1 text-xs bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 rounded-full px-2.5 py-1 transition-colors shadow-sm"
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
