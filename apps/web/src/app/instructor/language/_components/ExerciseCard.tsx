'use client';

import Link from 'next/link';
import { Brain, Edit, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LangExercise } from '@/types/language';
import { EXERCISE_ICONS, EXERCISE_TYPE_LABEL, LANG_NAMES } from '@/constants/language';

interface Props {
  exercise: LangExercise;
  busy: boolean;
  onDelete: () => void;
}

export function ExerciseCard({ exercise: ex, busy, onDelete }: Props) {
  const Icon = EXERCISE_ICONS[ex.type] || Brain;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold line-clamp-1">{ex.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {EXERCISE_TYPE_LABEL[ex.type]} · {LANG_NAMES[ex.language] || ex.language} · {ex.level}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ex._count?.questions ?? 0} câu · {ex._count?.attempts ?? 0} lượt làm
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Link href={`/instructor/language/exercise/${ex.id}`}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
          </Link>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={busy} onClick={onDelete}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
