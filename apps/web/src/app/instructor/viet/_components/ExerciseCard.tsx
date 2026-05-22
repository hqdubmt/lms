'use client';

import Link from 'next/link';
import { Loader2, ChevronRight, Trash2 } from 'lucide-react';
import type { VietExercise } from '@/types/viet';
import { EXERCISE_TYPE_LABEL } from '@/constants/viet';

interface Props {
  exercise: VietExercise;
  busy: boolean;
  onDelete: () => void;
}

export function ExerciseCard({ exercise: ex, busy, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg">
            {EXERCISE_TYPE_LABEL[ex.type] || ex.type}
          </span>
          <span className="text-xs text-muted-foreground">Lớp {ex.grade}</span>
        </div>
        <p className="font-semibold text-gray-900 text-sm truncate">{ex.title}</p>
        <p className="text-xs text-muted-foreground">{ex._count?.questions ?? 0} câu · {ex._count?.attempts ?? 0} lần làm</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href={`/viet/exercise/${ex.id}`}
          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
          <ChevronRight className="h-3.5 w-3.5" />Xem
        </Link>
        <button onClick={onDelete} disabled={busy}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
