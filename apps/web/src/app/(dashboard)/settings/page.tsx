'use client';

import { useEffect, useRef, useState } from 'react';
import {
  User, Lock, Bell, Camera, CheckCircle2, AlertCircle,
  Eye, EyeOff, Save, Loader2, Shield, Mail, AtSign,
  FileText, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string; email: string; name: string; username?: string;
  avatarUrl?: string; bio?: string; role: string;
  isVerified: boolean; createdAt: string;
  _count: { enrollments: number; coursesCreated: number };
}

type Tab = 'profile' | 'security' | 'notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Toast({ type, msg, onClose }: { type: 'success' | 'error'; msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4',
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white',
    )}>
      {type === 'success'
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />
      }
      {msg}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors shrink-0',
        checked ? 'bg-indigo-600' : 'bg-gray-200',
      )}
    >
      <span className={cn(
        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, onUpdate }: { profile: Profile; onUpdate: (p: Partial<Profile>) => void }) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    if (name.trim().length < 2) { setToast({ type: 'error', msg: 'Tên tối thiểu 2 ký tự' }); return; }
    setSaving(true);
    try {
      const updated = await api.patch<Profile>('/users/profile', {
        name: name.trim(),
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      onUpdate(updated);
      setToast({ type: 'success', msg: 'Đã lưu hồ sơ thành công' });
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Lưu thất bại' });
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setToast({ type: 'error', msg: 'Chỉ hỗ trợ JPG, PNG, WebP' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: 'error', msg: 'File tối đa 5MB' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const token = document.cookie.match(/auth_token=([^;]+)/)?.[1] || '';
      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload thất bại' }));
        throw new Error(err.error || 'Upload thất bại');
      }
      const { avatarUrl } = await res.json();
      onUpdate({ avatarUrl });
      setToast({ type: 'success', msg: 'Cập nhật ảnh đại diện thành công' });
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Upload ảnh thất bại' });
    }
    setUploadingAvatar(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <Section title="Ảnh đại diện" desc="Ảnh sẽ hiển thị trên hồ sơ và bình luận của bạn">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">{profile.name[0]?.toUpperCase()}</span>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {uploadingAvatar ? 'Đang tải...' : 'Đổi ảnh'}
            </button>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG hoặc WebP · Tối đa 5MB</p>
          </div>
        </div>
      </Section>

      {/* Info */}
      <Section title="Thông tin cá nhân" desc="Thông tin hiển thị công khai trên hồ sơ của bạn">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Họ và tên" hint="Tối thiểu 2 ký tự">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-9" placeholder="Nguyễn Văn A" />
              </div>
            </Field>
            <Field label="Tên người dùng" hint="Chỉ chữ cái, số và dấu gạch dưới">
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9" placeholder="nguyen_van_a" />
              </div>
            </Field>
          </div>

          <Field label="Email" hint="Email không thể thay đổi">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={profile.email} disabled className="pl-9 bg-gray-50 text-muted-foreground cursor-not-allowed" />
            </div>
          </Field>

          <Field label="Giới thiệu bản thân">
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder="Viết vài dòng giới thiệu về bản thân..."
                className="w-full border rounded-xl px-3 py-2 pl-9 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{bio.length}/500</span>
            </div>
          </Field>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </Section>

      {/* Account info */}
      <Section title="Thông tin tài khoản">
        <div className="space-y-3">
          {[
            { label: 'Vai trò', value: profile.role === 'STUDENT' ? 'Học viên' : profile.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Quản trị viên' },
            { label: 'Trạng thái', value: profile.isVerified ? 'Đã xác minh email' : 'Chưa xác minh email' },
            { label: 'Ngày tham gia', value: new Date(profile.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) },
            { label: 'Khoá học đã đăng ký', value: `${profile._count.enrollments} khoá học` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-gray-800">{row.value}</span>
            </div>
          ))}
        </div>
      </Section>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][strength];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) { setToast({ type: 'error', msg: 'Nhập mật khẩu hiện tại' }); return; }
    if (newPw.length < 6) { setToast({ type: 'error', msg: 'Mật khẩu mới tối thiểu 6 ký tự' }); return; }
    if (newPw !== confirm) { setToast({ type: 'error', msg: 'Mật khẩu xác nhận không khớp' }); return; }
    setSaving(true);
    try {
      await api.patch('/users/password', { currentPassword: current, newPassword: newPw });
      setToast({ type: 'success', msg: 'Đổi mật khẩu thành công' });
      setCurrent(''); setNewPw(''); setConfirm('');
    } catch (e: any) {
      setToast({ type: 'error', msg: e.message || 'Đổi mật khẩu thất bại' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <Section title="Đổi mật khẩu" desc="Sử dụng mật khẩu mạnh để bảo vệ tài khoản">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Mật khẩu hiện tại">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="pl-9 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Mật khẩu mới">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="pl-9 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= strength ? strengthColor : 'bg-gray-200')} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Độ mạnh: <span className="font-medium">{strengthLabel}</span></p>
              </div>
            )}
          </Field>

          <Field label="Xác nhận mật khẩu mới">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={cn('pl-9', confirm && newPw && confirm !== newPw ? 'border-red-400 focus-visible:ring-red-400' : '')}
                placeholder="••••••••"
              />
              {confirm && newPw && confirm !== newPw && (
                <p className="text-xs text-red-500 mt-1">Mật khẩu không khớp</p>
              )}
            </div>
          </Field>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Bảo mật tài khoản" desc="Quản lý các thiết lập bảo mật">
        <div className="space-y-1">
          {[
            {
              icon: Shield,
              title: 'Xác thực 2 bước (2FA)',
              desc: 'Thêm lớp bảo mật bằng mã OTP khi đăng nhập',
              badge: 'Sắp ra mắt',
              badgeCls: 'bg-indigo-100 text-indigo-600',
            },
            {
              icon: Lock,
              title: 'Phiên đăng nhập',
              desc: 'Quản lý các thiết bị đang đăng nhập tài khoản',
              badge: 'Sắp ra mắt',
              badgeCls: 'bg-indigo-100 text-indigo-600',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full shrink-0', item.badgeCls)}>{item.badge}</span>
            </div>
          ))}
        </div>
      </Section>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [settings, setSettings] = useState({
    emailNewSession: true,
    emailCourseUpdate: true,
    emailPromotion: false,
    browserNewSession: true,
    browserLiveAlert: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const groups = [
    {
      title: 'Email',
      desc: 'Thông báo gửi vào hòm thư của bạn',
      items: [
        { key: 'emailNewSession' as const, label: 'Lịch học mới', desc: 'Khi có buổi học mới được thêm vào khoá học' },
        { key: 'emailCourseUpdate' as const, label: 'Cập nhật khoá học', desc: 'Khi khoá học bạn đang học có nội dung mới' },
        { key: 'emailPromotion' as const, label: 'Khuyến mãi & tin tức', desc: 'Thông tin về khoá học mới và ưu đãi' },
      ],
    },
    {
      title: 'Trình duyệt',
      desc: 'Thông báo đẩy trên trình duyệt',
      items: [
        { key: 'browserNewSession' as const, label: 'Lịch học sắp diễn ra', desc: 'Nhắc nhở trước buổi học 15 phút' },
        { key: 'browserLiveAlert' as const, label: 'Buổi học đang LIVE', desc: 'Thông báo khi buổi học bắt đầu trực tiếp' },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <Section key={group.title} title={group.title} desc={group.desc}>
          <div className="space-y-1">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={settings[item.key]} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </Section>
      ))}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Save className="h-4 w-4" />Lưu cài đặt
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'profile', label: 'Hồ sơ cá nhân', icon: User },
  { key: 'security', label: 'Bảo mật', icon: Shield },
  { key: 'notifications', label: 'Thông báo', icon: Bell },
];

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Profile>('/users/profile')
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleProfileUpdate = (updated: Partial<Profile>) => {
    setProfile((prev) => prev ? { ...prev, ...updated } : prev);
    fetchMe();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Hero ── */}
      <div
        className="px-6 py-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}
      >
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white">Cài đặt</h1>
          <p className="text-white/60 text-sm mt-1">Quản lý hồ sơ và tuỳ chọn tài khoản của bạn</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* ── Sidebar tabs ── */}
          <aside className="sm:w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {/* User card */}
              {profile && (
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatarUrl
                      ? <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
                      : <span className="text-sm font-bold text-indigo-600">{profile.name[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </div>
              )}

              {/* Nav */}
              <nav className="p-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      tab === t.key
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <t.icon className="h-4 w-4 shrink-0" />
                      {t.label}
                    </span>
                    {tab === t.key && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {tab === 'profile' && profile && (
                  <ProfileTab profile={profile} onUpdate={handleProfileUpdate} />
                )}
                {tab === 'security' && <SecurityTab />}
                {tab === 'notifications' && <NotificationsTab />}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
