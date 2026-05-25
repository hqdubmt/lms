'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ForumCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  _count: { posts: number };
  latestPost?: { id: string; title: string; createdAt: string; author: { name: string; avatarUrl?: string } } | null;
}

function fmtDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}p trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}g trước`;
  return `${Math.floor(h / 24)}d trước`;
}

export default function ForumPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ForumCategory[]>('/forum/categories').then((d) => {
      setCategories(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Diễn đàn</h1>
        <p className="text-sm text-gray-500 mt-0.5">Trao đổi, thảo luận theo từng chủ đề</p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có chủ đề nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/forum/${cat.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-indigo-200 transition-all group">
              {/* Icon */}
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                style={{ background: (cat.color || '#6366f1') + '20' }}>
                {cat.icon || '💬'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{cat.name}</p>
                </div>
                {cat.description && <p className="text-sm text-gray-500 truncate mt-0.5">{cat.description}</p>}
                {cat.latestPost && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    <span className="text-indigo-500">{cat.latestPost.author.name}</span>
                    {' · '}{cat.latestPost.title.slice(0, 50)}{' · '}{fmtDate(cat.latestPost.createdAt)}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-lg font-bold text-gray-800">{cat._count.posts}</p>
                  <p className="text-[10px] text-gray-400">bài viết</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
