'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  BookOpen, ChevronRight, ArrowLeft, FolderOpen,
} from 'lucide-react';
import { LANG_NAMES } from '@/constants/language';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface ChildVocabSet {
  id: string;
  title: string;
  language: string;
  level: string;
  _count: { items: number };
  progresses: { wordsLearned: number; lastStudied: string }[];
}

interface FolderSet {
  id: string;
  title: string;
  language: string;
  level: string;
  _count: { items: number; children?: number };
  children: ChildVocabSet[];
  progresses: { wordsLearned: number; lastStudied: string }[];
  creator: { name: string };
}

export default function LanguageFolderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [folder, setFolder] = useState<FolderSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<FolderSet[]>('/language/vocab-sets/tree')
      .then((tree) => {
        const found = tree.find((s) => s.id === id);
        if (found) {
          setFolder(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-5xl mx-auto">
      <div className="h-8 w-48 rounded-xl bg-muted" />
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted" />)}
    </div>
  );

  if (notFound || !folder) return (
    <div className="max-w-5xl mx-auto text-center py-20">
      <p className="text-muted-foreground">Không tìm thấy thư mục.</p>
      <Link href="/language" className="mt-4 inline-block text-indigo-600 hover:underline text-sm font-medium">
        Quay lại Ngoại ngữ
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Link href="/language"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />Quay lại Ngoại ngữ
        </Link>
      </div>

      {/* Folder header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <FolderOpen className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{folder.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{LANG_NAMES[folder.language] || folder.language}</Badge>
            <span className="text-xs text-muted-foreground">{folder.children.length} bộ từ vựng</span>
          </div>
        </div>
      </div>

      {/* Children list */}
      {folder.children.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Thư mục trống</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folder.children.map((child) => {
            const prog = child.progresses?.[0];
            const pct = child._count.items > 0
              ? Math.round(((prog?.wordsLearned || 0) / child._count.items) * 100)
              : 0;
            return (
              <button key={child.id} type="button"
                onClick={() => router.push(`/language/vocab/${child.id}`)}
                className="text-left w-full">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">{child.level}</Badge>
                    </div>
                    <div className="font-semibold text-gray-900 line-clamp-2 mb-1">{child.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
                      <BookOpen className="h-3 w-3" />{child._count.items} từ
                    </div>
                    {child._count.items > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{prog?.wordsLearned || 0}/{child._count.items} đã học</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div className="h-1.5 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
