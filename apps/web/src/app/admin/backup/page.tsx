'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HardDrive, Play, Eye, ShieldCheck, RefreshCw, FileText,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  Terminal, Settings, Clock, CalendarClock, Plus, Trash2,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupStatus {
  config: Record<string, string>;
  scriptExists: boolean;
  rcloneExists: boolean;
  logInfo: { size: number; mtime: string; lastLines: string[] } | null;
  backupDir: string;
}

interface LogLine {
  type: 'out' | 'err' | 'start' | 'done' | 'error' | 'info';
  line?: string;
  cmd?: string;
  time?: string;
  code?: number;
  ok?: boolean;
  message?: string;
}

type RunState = 'idle' | 'running' | 'success' | 'error';

interface BackupSchedule {
  id: string; label: string; cron: string; cmd: 'run' | 'check';
  enabled: boolean; createdAt: string;
  lastRunAt?: string; lastRunOk?: boolean; nextRunAt?: string;
}

const CRON_PRESETS = [
  { label: 'Hàng ngày lúc 1:00',        cron: '0 1 * * *' },
  { label: 'Hàng ngày lúc 2:00',        cron: '0 2 * * *' },
  { label: 'Hàng ngày lúc 3:00',        cron: '0 3 * * *' },
  { label: 'Hàng ngày lúc 4:00',        cron: '0 4 * * *' },
  { label: 'Mỗi 6 giờ',                 cron: '0 */6 * * *' },
  { label: 'Mỗi 12 giờ',                cron: '0 */12 * * *' },
  { label: 'Hàng tuần — Chủ nhật 2:00', cron: '0 2 * * 0' },
  { label: 'Hàng tuần — Thứ 2 lúc 2:00', cron: '0 2 * * 1' },
  { label: 'Hàng tháng — ngày 1 lúc 2:00', cron: '0 2 1 * *' },
  { label: 'Tùy chỉnh (nhập cron)…',    cron: '' },
];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function ScheduleSection() {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [label, setLabel] = useState('');
  const [preset, setPreset] = useState(CRON_PRESETS[1].cron);
  const [customCron, setCustomCron] = useState('');
  const [cmd, setCmd] = useState<'run' | 'check'>('run');
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const isCustom = preset === '';
  const cron = isCustom ? customCron : preset;

  const load = () => {
    setLoading(true);
    api.get<BackupSchedule[]>('/admin/backup/schedules')
      .then(setSchedules).catch(() => setSchedules([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !cron.trim()) { setFormErr('Vui lòng điền đầy đủ thông tin'); return; }
    setSaving(true); setFormErr('');
    try {
      const s = await api.post<BackupSchedule>('/admin/backup/schedules', { label: label.trim(), cron: cron.trim(), cmd });
      setSchedules(prev => [...prev, s]);
      setLabel(''); setPreset(CRON_PRESETS[1].cron); setCustomCron(''); setShowForm(false);
    } catch (err: any) { setFormErr(err.message || 'Tạo thất bại'); }
    setSaving(false);
  };

  const toggle = async (s: BackupSchedule) => {
    setBusy(b => ({ ...b, [s.id]: true }));
    try {
      const updated = await api.put<BackupSchedule>(`/admin/backup/schedules/${s.id}`, { enabled: !s.enabled });
      setSchedules(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch {}
    setBusy(b => ({ ...b, [s.id]: false }));
  };

  const remove = async (id: string) => {
    if (!confirm('Xóa lịch này?')) return;
    setBusy(b => ({ ...b, [id]: true }));
    try {
      await api.delete(`/admin/backup/schedules/${id}`);
      setSchedules(prev => prev.filter(x => x.id !== id));
    } catch {}
    setBusy(b => ({ ...b, [id]: false }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Lịch hẹn tự động
          {schedules.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({schedules.length})</span>
          )}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-3.5 w-3.5" />Thêm lịch
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Form tạo lịch */}
        {showForm && (
          <form onSubmit={create} className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">Tạo lịch backup mới</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Tên lịch *</label>
                <input value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="VD: Backup hàng đêm"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Lịch chạy *</label>
                <select value={preset} onChange={e => setPreset(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {CRON_PRESETS.map(p => (
                    <option key={p.cron} value={p.cron}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Lệnh thực thi</label>
                <select value={cmd} onChange={e => setCmd(e.target.value as 'run' | 'check')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="run">Backup thật (run)</option>
                  <option value="check">Dry-run (check)</option>
                </select>
              </div>
              {isCustom && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Cron expression *</label>
                  <input value={customCron} onChange={e => setCustomCron(e.target.value)}
                    placeholder="VD: 0 2 * * * (2:00 AM mỗi ngày)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <p className="text-xs text-muted-foreground mt-1">Định dạng: phút giờ ngày tháng thứ</p>
                </div>
              )}
            </div>
            {!isCustom && cron && (
              <p className="text-xs text-muted-foreground font-mono bg-gray-50 px-3 py-1.5 rounded-lg">
                cron: <span className="text-gray-700">{cron}</span>
              </p>
            )}
            {formErr && <p className="text-xs text-red-500">{formErr}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
                Tạo lịch
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormErr(''); }}
                className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg transition-colors">
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Danh sách lịch */}
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : schedules.length === 0 && !showForm ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            Chưa có lịch nào — nhấn <strong>Thêm lịch</strong> để bắt đầu
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map(s => (
              <div key={s.id} className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                s.enabled ? 'border-green-100 bg-green-50/30' : 'border-gray-100 bg-gray-50/50',
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{s.label}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                      s.cmd === 'run' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                      {s.cmd === 'run' ? 'BACKUP' : 'DRY-RUN'}
                    </span>
                    {s.lastRunOk !== undefined && (
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                        s.lastRunOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                        {s.lastRunOk ? 'OK' : 'LỖI'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs font-mono text-gray-500">{s.cron}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />Tiếp theo: {fmtDate(s.nextRunAt)}
                    </span>
                    {s.lastRunAt && (
                      <span className="text-xs text-muted-foreground">Lần cuối: {fmtDate(s.lastRunAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggle(s)} disabled={busy[s.id]}
                    className={cn('flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                      s.enabled ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-gray-500 bg-gray-100 hover:bg-gray-200')}>
                    {busy[s.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                      s.enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {s.enabled ? 'Bật' : 'Tắt'}
                  </button>
                  <button onClick={() => remove(s.id)} disabled={busy[s.id]}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                    {busy[s.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Config groups ────────────────────────────────────────────────────────────

const CONFIG_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Nguồn & Đích', keys: ['BACKUP_SOURCE', 'BACKUP_REMOTE', 'BACKUP_DEST_PATH'] },
  { label: 'Chế độ', keys: ['BACKUP_MODE', 'BACKUP_FLAGS', 'BACKUP_TRANSFERS', 'BACKUP_CHECKERS'] },
  { label: 'Log', keys: ['LOG_FILE', 'LOG_LEVEL', 'NOTIFY_ON_SUCCESS', 'NOTIFY_ON_ERROR'] },
  { label: 'Rclone', keys: ['RCLONE_BINARY', 'RCLONE_CONFIG'] },
];

function configGroupFor(key: string) {
  return CONFIG_GROUPS.find(g => g.keys.includes(key))?.label ?? 'Khác';
}

// ─── Components ───────────────────────────────────────────────────────────────

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function TerminalOutput({ lines }: { lines: LogLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  if (!lines.length) return null;

  return (
    <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-72 space-y-0.5">
      {lines.map((l, i) => {
        if (l.type === 'start') {
          return (
            <div key={i} className="text-cyan-400">
              ▶ Bắt đầu lệnh: <span className="font-bold">{l.cmd}</span>
              <span className="text-gray-500 ml-2">{l.time && new Date(l.time).toLocaleTimeString('vi-VN')}</span>
            </div>
          );
        }
        if (l.type === 'done') {
          return (
            <div key={i} className={l.ok ? 'text-green-400' : 'text-red-400'}>
              {l.ok ? '✓ Hoàn thành thành công' : `✗ Lỗi (exit code: ${l.code})`}
            </div>
          );
        }
        if (l.type === 'error') {
          return <div key={i} className="text-red-400">✗ {l.message}</div>;
        }
        return (
          <div key={i} className={l.type === 'err' ? 'text-yellow-300' : 'text-gray-300'}>
            {l.line}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BackupPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runState, setRunState] = useState<RunState>('idle');
  const [output, setOutput] = useState<LogLine[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(() => {
    setLoading(true);
    api.get<BackupStatus>('/admin/backup/status')
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const runCommand = useCallback(async (cmd: string) => {
    if (runState === 'running') {
      abortRef.current?.abort();
      return;
    }

    setOutput([]);
    setRunState('running');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = api.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/backup/exec', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ cmd }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let success = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed: LogLine = JSON.parse(line.slice(6));
            setOutput(prev => [...prev, parsed]);
            if (parsed.type === 'done') success = parsed.ok ?? false;
          } catch { /* skip */ }
        }
      }

      setRunState(success ? 'success' : 'error');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setOutput(prev => [...prev, { type: 'error', message: err.message }]);
        setRunState('error');
      } else {
        setRunState('idle');
      }
    } finally {
      abortRef.current = null;
    }
  }, [runState]);

  const loadLogs = useCallback(() => {
    setLogLoading(true);
    api.get<{ lines: string[]; exists: boolean; total: number }>('/admin/backup/logs?lines=200')
      .then(d => setLogLines(d.lines))
      .catch(() => setLogLines([]))
      .finally(() => setLogLoading(false));
  }, []);

  const toggleLog = () => {
    if (!showLog) loadLogs();
    setShowLog(v => !v);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const configEntries = status ? Object.entries(status.config) : [];
  const grouped: Record<string, [string, string][]> = {};
  for (const [k, v] of configEntries) {
    const g = configGroupFor(k);
    (grouped[g] ??= []).push([k, v]);
  }

  const actions = [
    {
      cmd: 'run',
      label: 'Chạy backup',
      desc: 'Upload thật sự lên remote',
      icon: Play,
      color: 'bg-green-600 hover:bg-green-700',
      danger: true,
    },
    {
      cmd: 'check',
      label: 'Dry-run',
      desc: 'Xem trước thay đổi, không upload',
      icon: Eye,
      color: 'bg-blue-600 hover:bg-blue-700',
      danger: false,
    },
    {
      cmd: 'verify',
      label: 'Kiểm tra',
      desc: 'So sánh nguồn ↔ đích',
      icon: ShieldCheck,
      color: 'bg-violet-600 hover:bg-violet-700',
      danger: false,
    },
    {
      cmd: 'config',
      label: 'Xem config',
      desc: 'Hiển thị cấu hình hiện tại',
      icon: Settings,
      color: 'bg-gray-600 hover:bg-gray-700',
      danger: false,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-primary" />
            Backup hệ thống
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sao lưu dữ liệu lên remote storage qua rclone
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Làm mới
        </button>
      </div>

      {/* Status badges */}
      {loading ? (
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      ) : status && (
        <div className="flex flex-wrap gap-2">
          <Badge ok={status.scriptExists} label={status.scriptExists ? 'backup.sh sẵn sàng' : 'Thiếu backup.sh'} />
          <Badge ok={status.rcloneExists} label={status.rcloneExists ? 'rclone có mặt' : 'Thiếu rclone'} />
          {status.logInfo && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Lần cuối: {new Date(status.logInfo.mtime).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map(a => {
          const Icon = a.icon;
          const isActive = runState === 'running';
          return (
            <button
              key={a.cmd}
              onClick={() => runCommand(a.cmd)}
              disabled={!status?.scriptExists}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-xl text-white transition-all',
                a.color,
                'disabled:opacity-40 disabled:cursor-not-allowed',
                isActive && 'opacity-60',
              )}
            >
              <Icon className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="text-xs text-white/70">{a.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Terminal output */}
      {(output.length > 0 || runState === 'running') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Output</span>
              {runState === 'running' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {runState === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {runState === 'error' && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            {runState === 'running' && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Dừng
              </button>
            )}
          </div>
          <TerminalOutput lines={output} />
        </div>
      )}

      {/* Schedule section */}
      <ScheduleSection />

      {/* Config section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowConfig(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Cấu hình .env
          </div>
          {showConfig ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showConfig && (
          <div className="px-5 pb-5 space-y-4">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
              </div>
            ) : !status ? (
              <p className="text-sm text-red-500">Không thể đọc cấu hình</p>
            ) : configEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                File <code className="text-xs bg-gray-100 px-1 rounded">.env</code> chưa được cấu hình.
                Hãy chỉnh sửa <code className="text-xs bg-gray-100 px-1 rounded">{status.backupDir}/.env</code>
              </p>
            ) : (
              Object.entries(grouped).map(([group, pairs]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {pairs.map(([k, v]) => (
                      <div key={k} className="flex items-start gap-3 px-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <code className="text-xs text-gray-500 font-mono min-w-[200px] pt-0.5">{k}</code>
                        <span className="text-xs font-mono text-gray-800 break-all">
                          {v || <span className="text-gray-400 italic">chưa đặt</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {status && (
              <p className="text-xs text-muted-foreground pt-1">
                Đường dẫn backup: <code className="text-gray-600">{status.backupDir}</code>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Log viewer */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button
          onClick={toggleLog}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Log backup
            {status?.logInfo && (
              <span className="text-xs text-muted-foreground font-normal">
                ({Math.round(status.logInfo.size / 1024)} KB)
              </span>
            )}
          </div>
          {showLog ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showLog && (
          <div className="px-5 pb-5">
            {logLoading ? (
              <div className="h-40 rounded-xl bg-gray-950 animate-pulse" />
            ) : logLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Chưa có log</p>
            ) : (
              <>
                <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs text-gray-300 overflow-y-auto max-h-80 space-y-0.5">
                  {logLines.map((line, i) => (
                    <div key={i} className={cn(
                      line.includes('ERROR') || line.includes('THẤT BẠI') ? 'text-red-400' :
                      line.includes('OK') || line.includes('Hoàn thành') ? 'text-green-400' :
                      'text-gray-300',
                    )}>
                      {line}
                    </div>
                  ))}
                </div>
                <button
                  onClick={loadLogs}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />Tải lại log
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
