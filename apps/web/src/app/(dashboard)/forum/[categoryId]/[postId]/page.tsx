'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart, Pin, Lock, Send, Loader2, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string; role: string };
  _count: { likes: number };
}

interface Post {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isClosed: boolean;
  views: number;
  createdAt: string;
  category: { id: string; name: string; color?: string };
  author: { id: string; name: string; avatarUrl?: string; role: string };
  _count: { likes: number };
  replies: Reply[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Avatar({ user }: { user: { name: string; avatarUrl?: string } }) {
  return (
    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
      {user.avatarUrl
        ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        : <span className="text-xs font-bold text-white">{user.name[0]?.toUpperCase()}</span>}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') return <span className="text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5">Admin</span>;
  if (role === 'INSTRUCTOR') return <span className="text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 rounded-full px-1.5 py-0.5">GV</span>;
  return null;
}

export default function ForumPostPage() {
  const { categoryId, postId } = useParams<{ categoryId: string; postId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [postLiked, setPostLiked] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    api.get<Post>(`/forum/posts/${postId}`).then((d) => { setPost(d); }).finally(() => setLoading(false));
  }, [postId]);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const r = await api.post<Reply>(`/forum/posts/${postId}/replies`, { content: replyContent });
      setPost((prev) => prev ? { ...prev, replies: [...prev.replies, r] } : prev);
      setReplyContent('');
    } catch {}
    setSending(false);
  };

  const handleLikePost = async () => {
    if (!post) return;
    try {
      const { liked } = await api.post<{ liked: boolean }>(`/forum/posts/${postId}/like`, {});
      setPostLiked(liked);
      setPost((p) => p ? { ...p, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) } } : p);
    } catch {}
  };

  const handleLikeReply = async (replyId: string) => {
    try {
      const { liked } = await api.post<{ liked: boolean }>(`/forum/replies/${replyId}/like`, {});
      setLikedReplies((prev) => {
        const s = new Set(prev);
        liked ? s.add(replyId) : s.delete(replyId);
        return s;
      });
      setPost((p) => p ? { ...p, replies: p.replies.map((r) => r.id === replyId ? { ...r, _count: { likes: r._count.likes + (liked ? 1 : -1) } } : r) } : p);
    } catch {}
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Xóa bình luận này?')) return;
    try {
      await api.delete(`/forum/replies/${replyId}`);
      setPost((p) => p ? { ...p, replies: p.replies.filter((r) => r.id !== replyId) } : p);
    } catch {}
  };

  const handleEditReply = async (replyId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await api.patch<Reply>(`/forum/replies/${replyId}`, { content: editContent });
      setPost((p) => p ? { ...p, replies: p.replies.map((r) => r.id === replyId ? { ...r, content: updated.content } : r) } : p);
      setEditingReply(null);
    } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  if (!post) return <div className="text-center py-20 text-gray-400">Không tìm thấy bài viết</div>;

  const canModify = (authorId: string) => user?.id === authorId || user?.role === 'ADMIN';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Back */}
      <button onClick={() => router.push(`/forum/${categoryId}`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-medium" style={{ color: post.category.color || '#6366f1' }}>{post.category.name}</span>
      </button>

      {/* Post */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar user={post.author} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-gray-800">{post.author.name}</p>
              <RoleBadge role={post.author.role} />
              {post.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
              {post.isClosed && <Lock className="h-3.5 w-3.5 text-gray-400" />}
            </div>
            <p className="text-xs text-gray-400">{fmtDate(post.createdAt)}</p>
          </div>
        </div>

        <h1 className="text-lg font-bold text-gray-900">{post.title}</h1>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <button onClick={handleLikePost}
            className={cn('flex items-center gap-1.5 text-sm transition-colors', postLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}>
            <Heart className={cn('h-4 w-4', postLiked && 'fill-current')} />
            <span>{post._count.likes + (postLiked ? 1 : 0)}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <MessageSquare className="h-4 w-4" />{post.replies.length} bình luận
          </span>
        </div>
      </div>

      {/* Replies */}
      {post.replies.length > 0 && (
        <div className="space-y-3">
          {post.replies.map((reply) => (
            <div key={reply.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar user={reply.author} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-800">{reply.author.name}</p>
                    <RoleBadge role={reply.author.role} />
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(reply.createdAt)}</p>
                </div>
                {canModify(reply.author.id) && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingReply(reply.id); setEditContent(reply.content); }}
                      className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => handleDeleteReply(reply.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {editingReply === reply.id ? (
                <div className="space-y-2">
                  <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleEditReply(reply.id)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700">Lưu</button>
                    <button onClick={() => setEditingReply(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">Hủy</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              )}

              <button onClick={() => handleLikeReply(reply.id)}
                className={cn('flex items-center gap-1.5 text-xs transition-colors', likedReplies.has(reply.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-400')}>
                <Heart className={cn('h-3.5 w-3.5', likedReplies.has(reply.id) && 'fill-current')} />
                {reply._count.likes + (likedReplies.has(reply.id) ? 1 : 0)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {!post.isClosed ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Thêm bình luận</p>
          <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Viết bình luận..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
          <div className="flex justify-end">
            <button onClick={handleReply} disabled={sending || !replyContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Gửi
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
          <Lock className="h-4 w-4" />Bài viết đã đóng bình luận
        </div>
      )}
    </div>
  );
}
