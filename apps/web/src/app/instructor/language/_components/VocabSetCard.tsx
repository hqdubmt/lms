'use client';

import Link from 'next/link';
import { BookOpen, Edit, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VocabSet } from '@/types/language';
import { LANG_NAMES } from '@/constants/language';

interface Props {
  set: VocabSet;
  busy: boolean;
  onDelete: () => void;
}

export function VocabSetCard({ set, busy, onDelete }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold line-clamp-1">{set.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{LANG_NAMES[set.language] || set.language}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className="text-xs">{set.level}</Badge>
            <Link href={`/instructor/language/vocab/${set.id}`}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
            </Link>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={busy} onClick={onDelete}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto">
          <BookOpen className="h-3.5 w-3.5" />{set._count?.items ?? 0} từ
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">bởi {set.creator.name}</span>
          <Link href={`/language/vocab/${set.id}`} className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Xem thử <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
