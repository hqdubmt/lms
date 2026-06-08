'use client';

import { useEffect, useState } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { usePronunciation } from '@/hooks/usePronunciation';
import type { IpaGuideEntry } from '@/services/pronunciationApi';

interface IpaGuideModalProps {
  onClose: () => void;
}

type Tab = 'vowels' | 'diphthongs' | 'consonants';

const TAB_LABELS: Record<Tab, string> = {
  vowels: 'Nguyên âm đơn',
  diphthongs: 'Nguyên âm đôi',
  consonants: 'Phụ âm',
};

function IpaRow({ entry }: { entry: IpaGuideEntry }) {
  const handleTts = () => {
    const word = entry.example.split(',')[0].trim();
    const url = `/api/language/tts?text=${encodeURIComponent(word)}&lang=en-US`;
    new Audio(url).play().catch(() => {});
  };

  return (
    <button
      onClick={handleTts}
      className="flex items-start gap-3 w-full text-left hover:bg-blue-50 rounded-lg px-2 py-2 transition-colors group"
    >
      <span className="font-mono text-base font-bold text-blue-700 w-12 shrink-0">{entry.symbol}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 font-medium">{entry.example}</p>
        <p className="text-xs text-gray-400 mt-0.5">{entry.hint}</p>
      </div>
    </button>
  );
}

export function IpaGuideModal({ onClose }: IpaGuideModalProps) {
  const { ipaGuide, loading, error, loadIpaGuide } = usePronunciation();
  const [tab, setTab] = useState<Tab>('vowels');

  useEffect(() => {
    loadIpaGuide();
  }, [loadIpaGuide]);

  const entries = ipaGuide?.[tab] ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-800">Bảng phiên âm IPA</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${
                tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          )}
          {error && <p className="text-xs text-red-500 text-center py-4">{error}</p>}
          {entries.map((entry, i) => <IpaRow key={i} entry={entry} />)}
        </div>

        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">Nhấn vào ký hiệu để nghe phát âm mẫu</p>
        </div>
      </div>
    </div>
  );
}
