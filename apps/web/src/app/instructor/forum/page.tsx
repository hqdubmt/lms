'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Trash2, Pencil, X, Loader2, Pin, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface Category {
  id: string; name: string; description?: string;
  icon?: string; color?: string; order: number;
  isHidden: boolean;
  _count: { posts: number };
}

interface Post {
  id: string; title: string; isPinned: boolean; isClosed: boolean;
  isHidden: boolean;
  views: number; createdAt: string;
  author: { id: string; name: string };
  _count: { replies: number };
  categoryId: string;
}

const ICON_OPTIONS = ['💬', '📚', '🔬', '🎮', '🌍', '💡', '🎯', '🏆', '📝', '❓'];
const COLOR_OPTIONS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InstructorForumPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'posts'>('categories');
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('💬');
  const [catColor, setCatColor] = useState('#6366f1');
  const [catOrder, setCatOrder] = useState(0);
  const [savingCat, setSavingCat] = useState(false);

  // Recent posts across all categories
  const [posts, setPosts] = useState<Post[]>([]);

  const loadCategories = () => {
    api.get<Category[]>('/forum/categories').then((d) => setCategories(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  };

  const loadPosts = async () => {
    const allPosts: Post[] = [];
    for (const cat of categories) {
      const d = await api.get<{ posts: Post[] }>(`/forum/categories/${cat.id}/posts?page=1`).catch(() => null);
      if (d?.posts) allPosts.push(...d.posts.map((p) => ({ ...p, categoryId: cat.id })));
    }
    setPosts(allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (activeTab === 'posts' && categories.length > 0) loadPosts(); }, [activeTab, categories]);

  const openCreateCat = () => {
    setEditingCat(null); setCatName(''); setCatDesc(''); setCatIcon('💬'); setCatColor('#6366f1'); setCatOrder(0);
    setShowCatForm(true);
  };
  const openEditCat = (c: Category) => {
    setEditingCat(c); setCatName(c.name); setCatDesc(c.description || ''); setCatIcon(c.icon || '💬'); setCatColor(c.color || '#6366f1'); setCatOrder(c.order);
    setShowCatForm(true);
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      if (editingCat) {
        const updated = await api.patch<Category>(`/forum/categories/${editingCat.id}`, { name: catName, description: catDesc, icon: catIcon, color: catColor, order: catOrder });
        setCategories((p) => p.map((c) => c.id === editingCat.id ? { ...c, ...updated } : c));
      } else {
        const created = await api.post<Category>('/forum/categories', { name: catName, description: catDesc, icon: catIcon, color: catColor, order: catOrder });
        setCategories((p) => [...p, { ...created, _count: { posts: 0 } }]);
      }
      setShowCatForm(false);
    } catch {}
    setSavingCat(false);
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Xóa chủ đề này? Tất cả bài viết sẽ bị xóa.')) return;
    await api.delete(`/forum/categories/${id}`);
    setCategories((p) => p.filter((c) => c.id !== id));
  };

  const handleToggleCatHidden = async (cat: Category) => {
    await api.patch(`/forum/categories/${cat.id}/toggle-hidden`, {});
    setCategories((p) => p.map((c) => c.id === cat.id ? { ...c, isHidden: !c.isHidden } : c));
  };

  const handleTogglePin = async (post: Post) => {
    await api.patch(`/forum/posts/${post.id}`, { isPinned: !post.isPinned });
    setPosts((p) => p.map((pp) => pp.id === post.id ? { ...pp, isPinned: !pp.isPinned } : pp));
  };

  const handleToggleClose = async (post: Post) => {
    await api.patch(`/forum/posts/${post.id}`, { isClosed: !post.isClosed });
    setPosts((p) => p.map((pp) => pp.id === post.id ? { ...pp, isClosed: !pp.isClosed } : pp));
  };

  const handleTogglePostHidden = async (post: Post) => {
    await api.patch(`/forum/posts/${post.id}/toggle-hidden`, {});
    setPosts((p) => p.map((pp) => pp.id === post.id ? { ...pp, isHidden: !pp.isHidden } : pp));
  };

  const handleDeletePost = async (post: Post) => {
    if (!confirm('Xóa bài viết này?')) return;
    await api.delete(`/forum/posts/${post.id}`);
    setPosts((p) => p.filter((pp) => pp.id !== post.id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý diễn đàn</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý chủ đề và bài viết</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateCat}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" />Thêm chủ đề
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['categories', 'posts'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {tab === 'categories' ? 'Chủ đề' : 'Bài viết gần đây'}
          </button>
        ))}
      </div>

      {/* Categories */}
      {activeTab === 'categories' && (
        loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className={cn('flex items-center gap-4 p-4 bg-white rounded-xl border', cat.isHidden ? 'border-gray-200 opacity-60' : 'border-gray-200')}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                  style={{ background: (cat.color || '#6366f1') + '20' }}>
                  {cat.icon || '💬'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{cat.name}</p>
                    {cat.isHidden && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">Đã ẩn</span>}
                  </div>
                  {cat.description && <p className="text-xs text-gray-500 truncate">{cat.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{cat._count.posts} bài viết</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/forum/${cat.id}`} className="text-xs text-indigo-600 hover:underline px-2 py-1 rounded-lg hover:bg-indigo-50">Xem</Link>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleToggleCatHidden(cat)} title={cat.isHidden ? 'Hiện chủ đề' : 'Ẩn chủ đề'}
                        className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-colors', cat.isHidden ? 'text-gray-500 bg-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}>
                        {cat.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => openEditCat(cat)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCat(cat.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!isAdmin && categories.length === 0 && (
              <p className="text-center text-gray-400 py-10">Chưa có chủ đề nào</p>
            )}
          </div>
        )
      )}

      {/* Recent posts */}
      {activeTab === 'posts' && (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Chưa có bài viết nào</p>
          ) : posts.slice(0, 50).map((post) => {
            const cat = categories.find((c) => c.id === post.categoryId);
            return (
              <div key={post.id} className={cn('flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200', post.isHidden && 'opacity-60')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {post.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                    {post.isClosed && <Lock className="h-3 w-3 text-gray-400" />}
                    {post.isHidden && <EyeOff className="h-3 w-3 text-gray-400" />}
                    <p className="font-medium text-sm text-gray-900 truncate">{post.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cat?.name} · {post.author.name} · {fmtDate(post.createdAt)} · {post._count.replies} trả lời
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleTogglePin(post)} title={post.isPinned ? 'Bỏ ghim' : 'Ghim'}
                    className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-colors', post.isPinned ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50')}>
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleToggleClose(post)} title={post.isClosed ? 'Mở lại' : 'Đóng'}
                    className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-colors', post.isClosed ? 'text-gray-500 bg-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}>
                    <Lock className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleTogglePostHidden(post)} title={post.isHidden ? 'Hiện bài' : 'Ẩn bài'}
                    className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-colors', post.isHidden ? 'text-gray-500 bg-gray-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}>
                    {post.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <Link href={`/forum/${post.categoryId}/${post.id}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Link>
                  <button onClick={() => handleDeletePost(post)} className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category form modal */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCatForm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingCat ? 'Sửa chủ đề' : 'Thêm chủ đề'}</h3>
              <button onClick={() => setShowCatForm(false)} className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Tên chủ đề..."
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Mô tả (tùy chọn)..."
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />

            {/* Icon picker */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Icon</p>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map((ico) => (
                  <button key={ico} onClick={() => setCatIcon(ico)}
                    className={cn('h-9 w-9 rounded-lg text-xl flex items-center justify-center border-2 transition-colors', catIcon === ico ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300')}>
                    {ico}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Màu sắc</p>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} onClick={() => setCatColor(c)}
                    className={cn('h-7 w-7 rounded-full border-2 transition-all', catColor === c ? 'border-gray-800 scale-110' : 'border-transparent hover:border-gray-400')}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            <input type="number" value={catOrder} onChange={(e) => setCatOrder(Number(e.target.value))} placeholder="Thứ tự (số nhỏ lên trước)"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />

            <div className="flex gap-3">
              <button onClick={handleSaveCat} disabled={savingCat || !catName.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors">
                {savingCat && <Loader2 className="h-4 w-4 animate-spin" />}Lưu
              </button>
              <button onClick={() => setShowCatForm(false)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
