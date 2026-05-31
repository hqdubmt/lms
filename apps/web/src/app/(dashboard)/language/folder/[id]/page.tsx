'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  BookOpen, ChevronRight, ArrowLeft, FolderOpen, TrendingUp, Star,
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

      {/* Folder summary stats */}
      {folder.children.length > 0 && (() => {
        const totalItems = folder.children.reduce((s, c) => s + c._count.items, 0);
        const totalLearned = folder.children.reduce((s, c) => s + (c.progresses?.[0]?.wordsLearned || 0), 0);
        const overallPct = totalItems > 0 ? Math.round((totalLearned / totalItems) * 100) : 0;
        return (
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-indigo-50 border-indigo-100">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{totalItems}</p>
                <p className="text-xs text-indigo-600">Tổng từ vựng</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{totalLearned}</p>
                <p className="text-xs text-green-600">Đã học · {overallPct}%</p>
              </CardContent>
            </Card>
            <Link href="/language/analytics" className="block">
              <Card className="bg-violet-50 border-violet-100 h-full hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-3 text-center h-full flex flex-col items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-violet-600 mb-0.5" />
                  <p className="text-xs text-violet-600 font-medium">Xem phân tích</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })()}

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
            const learned = prog?.wordsLearned || 0;
            const pct = child._count.items > 0 ? Math.round((learned / child._count.items) * 100) : 0;
            const levelColor: Record<string, string> = {
              A1: 'bg-blue-100 text-blue-700 border-blue-200',
              A2: 'bg-green-100 text-green-700 border-green-200',
              B1: 'bg-yellow-100 text-yellow-700 border-yellow-200',
              B2: 'bg-orange-100 text-orange-700 border-orange-200',
              C1: 'bg-red-100 text-red-700 border-red-200',
              C2: 'bg-purple-100 text-purple-700 border-purple-200',
            };
            const barColor = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-indigo-300';
            const lastStudied = prog?.lastStudied ? new Date(prog.lastStudied).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : null;
            return (
              <button key={child.id} type="button"
                onClick={() => router.push(`/language/vocab/${child.id}`)}
                className="text-left w-full">
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        {pct >= 80 ? <Star className="h-4 w-4 text-yellow-500" /> : <BookOpen className="h-4 w-4 text-indigo-600" />}
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${levelColor[child.level] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {child.level}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 line-clamp-2 text-sm mb-1 flex-1">{child.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{child._count.items} từ</span>
                      {lastStudied && <span className="text-xs text-muted-foreground">{lastStudied}</span>}
                    </div>
                    {child._count.items > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{learned}/{child._count.items}</span>
                          <span className={pct >= 80 ? 'text-green-600 font-medium' : ''}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full">
                          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-end mt-2">
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
