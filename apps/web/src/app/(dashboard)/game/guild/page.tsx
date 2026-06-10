'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Plus, LogIn, Star, Crown, Copy, Check, LogOut, Loader2, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface GuildMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  isOwner: boolean;
  isMe: boolean;
}

interface MyGuild {
  id: string;
  name: string;
  description: string;
  code: string;
  ownerId: string;
  totalXP: number;
  members: GuildMember[];
}

type View = 'loading' | 'none' | 'mine' | 'creating' | 'joining';

export default function GuildPage() {
  const [view, setView] = useState<View>('loading');
  const [guild, setGuild] = useState<MyGuild | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<MyGuild | null>('/ai/guild/my')
      .then(g => { setGuild(g); setView(g ? 'mine' : 'none'); })
      .catch(() => setView('none'));
  }, []);

  const copyCode = () => {
    if (!guild) return;
    navigator.clipboard.writeText(guild.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createGuild = async () => {
    if (!name.trim()) { setError('Nhập tên guild'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/ai/guild/create', { name: name.trim(), description: description.trim() });
      const g = await api.get<MyGuild>('/ai/guild/my');
      setGuild(g); setView('mine');
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tạo guild');
    } finally { setSubmitting(false); }
  };

  const joinGuild = async () => {
    if (code.length < 4) { setError('Nhập mã guild (4-8 ký tự)'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/ai/guild/join', { code: code.trim().toUpperCase() });
      const g = await api.get<MyGuild>('/ai/guild/my');
      setGuild(g); setView('mine');
    } catch (e: any) {
      setError(e.message ?? 'Mã không hợp lệ');
    } finally { setSubmitting(false); }
  };

  const leaveGuild = async () => {
    if (!confirm('Bạn có chắc muốn rời khỏi guild?')) return;
    try {
      await api.delete('/ai/guild/leave');
      setGuild(null); setView('none');
    } catch (e: any) {
      alert(e.message ?? 'Lỗi');
    }
  };

  if (view === 'loading') {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/game" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <Users className="w-6 h-6 text-violet-600" />
        <h1 className="text-2xl font-black text-gray-900">Guild</h1>
      </div>

      {/* My Guild */}
      {view === 'mine' && guild && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-purple-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">{guild.name}</h2>
                {guild.description && <p className="text-sm text-gray-500 mt-0.5">{guild.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl shrink-0">
                <Star className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-700">{guild.totalXP.toLocaleString()} XP</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-xl border px-4 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Mã mời</p>
                <p className="text-lg font-black font-mono tracking-widest text-violet-700">{guild.code}</p>
              </div>
              <button onClick={copyCode}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="rounded-2xl border bg-white">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Thành viên ({guild.members.length}/20)</h3>
              <Shield className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y">
              {guild.members.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${m.isMe ? 'bg-blue-50' : ''}`}>
                  <div className="w-8 text-center">
                    {i === 0 ? <Crown className="w-4 h-4 text-yellow-500 mx-auto" />
                      : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      : m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {m.name}
                      {m.isMe && <span className="ml-1.5 text-xs text-blue-500">(bạn)</span>}
                      {m.isOwner && <span className="ml-1.5 text-xs text-yellow-600">Guild Master</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3 h-3" />
                    {m.xp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={leaveGuild}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition">
            <LogOut className="w-4 h-4" />
            Rời khỏi guild
          </button>
        </div>
      )}

      {/* No guild — choose create or join */}
      {view === 'none' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => { setView('creating'); setError(''); }}
            className="rounded-2xl border-2 border-dashed border-violet-300 p-6 text-left hover:border-violet-500 hover:bg-violet-50 transition">
            <Plus className="w-8 h-8 text-violet-600 mb-3" />
            <h3 className="font-bold text-gray-900">Tạo Guild mới</h3>
            <p className="text-sm text-gray-500 mt-1">Trở thành Guild Master, mời bạn bè cùng học</p>
          </button>
          <button onClick={() => { setView('joining'); setError(''); }}
            className="rounded-2xl border-2 border-dashed border-teal-300 p-6 text-left hover:border-teal-500 hover:bg-teal-50 transition">
            <LogIn className="w-8 h-8 text-teal-600 mb-3" />
            <h3 className="font-bold text-gray-900">Tham gia Guild</h3>
            <p className="text-sm text-gray-500 mt-1">Nhập mã mời để gia nhập guild của bạn bè</p>
          </button>
        </div>
      )}

      {/* Create form */}
      {view === 'creating' && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Tạo Guild mới</h3>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên Guild *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="VD: Toán Học Vô Địch"
              className="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mô tả (tuỳ chọn)</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Giới thiệu ngắn về guild"
              className="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('none')} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Huỷ
            </button>
            <button onClick={createGuild} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Tạo Guild
            </button>
          </div>
        </div>
      )}

      {/* Join form */}
      {view === 'joining' && (
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Tham gia Guild</h3>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã mời</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="VD: AB1C2D"
              maxLength={8}
              className="mt-1 w-full border rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('none')} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Huỷ
            </button>
            <button onClick={joinGuild} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Tham gia
            </button>
          </div>
        </div>
      )}

      {/* Guild leaderboard link */}
      <Link href="/leaderboard"
        className="flex items-center gap-3 rounded-2xl border bg-gray-50 p-4 hover:bg-gray-100 transition">
        <Star className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-semibold text-gray-700">Xem bảng xếp hạng Guild</span>
        <span className="ml-auto text-gray-400 text-sm">→</span>
      </Link>
    </div>
  );
}
