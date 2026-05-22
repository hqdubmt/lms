'use client';

import Link from 'next/link';
import { Loader2, Sparkles, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VietSet } from '@/types/viet';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/constants/viet';

interface Props {
  set: VietSet;
  busy: boolean;
  genBusy: boolean;
  onDelete: () => void;
  onGenerateAll: () => void;
}

export function SetCard({ set, busy, genBusy, onDelete, onGenerateAll }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg', CATEGORY_COLOR[set.category] || 'bg-gray-100 text-gray-600')}>
            {CATEGORY_LABEL[set.category]}
          </span>
          <span className="text-xs text-muted-foreground">Lớp {set.grade}</span>
          {!set.isPublic && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Riêng tư</span>}
        </div>
        <p className="font-semibold text-gray-900 text-sm truncate">{set.title}</p>
        <p className="text-xs text-muted-foreground">{set._count?.items ?? 0} mục · {set._count?.exercises ?? 0} bài tập</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onGenerateAll} disabled={genBusy || (set._count?.items ?? 0) < 2}
          title={(set._count?.items ?? 0) < 2 ? 'Cần ít nhất 2 mục' : 'Tạo tất cả bài tập'}
          className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {genBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Tạo tất cả
        </button>
        <Link href={`/instructor/viet/set/${set.id}`}
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
          <Edit3 className="h-3.5 w-3.5" />Quản lý
        </Link>
        <button onClick={onDelete} disabled={busy}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
