'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare, ChevronRight, ArrowLeft, Pin, Lock, Plus, Loader2, Eye, Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface Post {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isClosed: boolean;
  views: number;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string };
  _count: { replies: number; likes: number };
}

interface Category { id: string; name: string; description?: string; color?: string; icon?: string; }

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return d.toLocaleDateString('vi-VN');
}

function NewPostModal({ categoryId, onClose, onCreated }: {
  categoryId: string; onClose: () => void; onCreated: (p: Post) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { setErr('Nhập đầy đủ tiêu đề và nội dung'); return; }
    setSaving(true);
    try {
      const p = await api.post<Post>('/forum/posts', { title, content, categoryId });
      onCreated(p);
    } catch (e: any) { setErr(e?.message || 'Lỗi khi tạo bài'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h3 className="font-bold text-gray-900">Tạo bài viết mới</h3>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bài viết..."
          className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Nội dung..."
          rows={6}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Đăng bài
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
        </div>
      </div>
    </div>
  );
}

export default function ForumCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.get<{ posts: Post[]; total: number }>(`/forum/categories/${categoryId}/posts?page=${p}`);
      if (p === 1) setPosts(data.posts || []);
      else setPosts((prev) => [...prev, ...(data.posts || [])]);
      setTotal(data.total || 0);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    // Fetch category info too
    api.get<{ categories: Category[] }>('/forum/categories').then((d) => {
      // Actually categories endpoint returns array directly
    }).catch(() => {});
    api.get<Category[]>('/forum/categories').then((d) => {
      if (Array.isArray(d)) {
        const cat = d.find((c: any) => c.id === categoryId);
        if (cat) setCategory(cat);
      }
    }).catch(() => {});
    load(1);
  }, [categoryId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/forum')} className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {category?.icon && <span className="text-xl">{category.icon}</span>}
            <h1 className="text-xl font-bold text-gray-900">{category?.name || '...'}</h1>
          </div>
          {category?.description && <p className="text-sm text-gray-500">{category.description}</p>}
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />Tạo bài
        </button>
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có bài viết nào</p>
          <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-indigo-600 hover:underline">Tạo bài đầu tiên</button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {posts.map((post) => (
              <Link key={post.id} href={`/forum/${categoryId}/${post.id}`}
                className={cn(
                  'flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:shadow-sm hover:border-indigo-200 group',
                  post.isPinned ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200',
                )}>
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {post.author.avatarUrl
                    ? <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <span className="text-xs font-bold text-white">{post.author.name[0]?.toUpperCase()}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {post.isPinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                    {post.isClosed && <Lock className="h-3 w-3 text-gray-400 shrink-0" />}
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{post.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{post.author.name} · {fmtDate(post.createdAt)}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{post._count.replies}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{post._count.likes}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.views}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors ml-1" />
                </div>
              </Link>
            ))}
          </div>

          {posts.length < total && (
            <div className="flex justify-center">
              <button onClick={() => load(page + 1)} disabled={loading}
                className="px-6 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Tải thêm'}
              </button>
            </div>
          )}
        </>
      )}

      {showNew && (
        <NewPostModal
          categoryId={categoryId}
          onClose={() => setShowNew(false)}
          onCreated={(p) => { setPosts((prev) => [p, ...prev]); setShowNew(false); }}
        />
      )}
    </div>
  );
}
