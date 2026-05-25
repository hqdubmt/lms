'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Edit, Trash2, Loader2, ChevronRight, Gamepad2, Plus, FolderOpen, Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VocabSet } from '@/types/language';
import { LANG_NAMES } from '@/constants/language';

interface Props {
  set: VocabSet;
  busy: boolean;
  quizBusy: boolean;
  onDelete: () => void;
  onGenerateQuiz: () => void;
  onAddChild?: () => void;
}

export function VocabSetCard({ set, busy, quizBusy, onDelete, onGenerateQuiz, onAddChild }: Props) {
  const itemCount = set._count?.items ?? 0;
  const childCount = set._count?.children ?? set.children?.length ?? 0;
  const [expanded, setExpanded] = useState(false);
  const hasChildren = childCount > 0 || (set.children && set.children.length > 0);

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {hasChildren
                ? <button onClick={() => setExpanded(e => !e)} className="text-indigo-500 hover:text-indigo-700">
                    {expanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  </button>
                : <BookOpen className="h-4 w-4 text-muted-foreground" />
              }
              <div className="font-semibold line-clamp-1">{set.title}</div>
            </div>
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

        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-auto">
          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{itemCount} từ</span>
          {childCount > 0 && <span className="flex items-center gap-1"><Folder className="h-3.5 w-3.5" />{childCount} chủ đề</span>}
        </div>

        {/* Sub-topics expanded view */}
        {expanded && set.children && set.children.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-1.5">
            {set.children.map((child) => (
              <div key={child.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="text-sm flex-1 truncate">{child.title}</span>
                <span className="text-xs text-gray-400">{child._count?.items ?? 0} từ</span>
                <Link href={`/instructor/language/vocab/${child.id}`} className="text-xs text-indigo-600 hover:underline shrink-0">Sửa</Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex gap-1">
            <button
              onClick={onGenerateQuiz}
              disabled={quizBusy || itemCount < 4}
              title={itemCount < 4 ? 'Cần ít nhất 4 từ' : 'Tạo Quiz Game từ bộ từ này'}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quizBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gamepad2 className="h-3.5 w-3.5" />}
              Quiz
            </button>
            {onAddChild && (
              <button
                onClick={onAddChild}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />Chủ đề
              </button>
            )}
          </div>
          <Link href={`/language/vocab/${set.id}`} className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Xem <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
