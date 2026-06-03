import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
// @ts-ignore
import cronParser from 'cron-parser';

const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '../../../../../codebackup');
const BACKUP_SCRIPT = path.join(BACKUP_DIR, 'backup.sh');
const DB_SCRIPT = process.env.DB_BACKUP_SCRIPT || path.resolve(__dirname, '../../../../../database/db-backup.sh');
const DB_RESTORE_SCRIPT = process.env.DB_RESTORE_SCRIPT || path.resolve(__dirname, '../../../../../database/db-restore.sh');
const BACKUP_ENV = path.join(BACKUP_DIR, '.env');
const BACKUP_LOG = path.join(BACKUP_DIR, 'backup.log');

const BACKUP_SCHEDULES = path.join(BACKUP_DIR, 'schedules.json');
const SENSITIVE_KEYS = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PASS', 'CRYPT'];

// ─── Drive listing ────────────────────────────────────────────────────────────

interface DriveInfo {
  filesystem: string; fstype: string; size: string;
  used: string; avail: string; usePct: string; mountpoint: string;
}

function listDrives(): DriveInfo[] {
  try {
    const out = execSync('df -hT 2>/dev/null', { encoding: 'utf8' });
    return out.trim().split('\n').slice(1)
      .map(line => {
        const p = line.split(/\s+/);
        if (p.length < 7) return null;
        const [filesystem, fstype, size, used, avail, usePct, ...mps] = p;
        const mountpoint = mps.join(' ');
        return { filesystem, fstype, size, used, avail, usePct, mountpoint };
      })
      .filter((d): d is DriveInfo => {
        if (!d) return false;
        return /^\/(?:mnt|media|run\/media)/.test(d.mountpoint);
      });
  } catch { return []; }
}

// ─── Rclone remotes ───────────────────────────────────────────────────────────

interface RcloneRemote { name: string; type: string; }

function listRcloneRemotes(): RcloneRemote[] {
  try {
    const rcloneBin = process.env.RCLONE_BIN || 'rclone';
    const out = execSync(`${rcloneBin} listremotes --long 2>/dev/null`, { encoding: 'utf8' });
    return out.trim().split('\n')
      .filter(l => l.trim())
      .map(l => {
        const [nameColon, type] = l.split(/\s+/);
        return { name: nameColon?.replace(/:$/, '') ?? '', type: type?.trim() ?? '' };
      })
      .filter(r => r.name && !['s3', 'minio'].includes(r.type));
  } catch { return []; }
}

// ─── Schedule types & storage ─────────────────────────────────────────────────

interface BackupSchedule {
  id: string;
  label: string;
  cron: string;
  cmd: 'run' | 'check';
  diskDest?: string;
  gdriveDest?: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  lastRunOk?: boolean;
  nextRunAt?: string;
}

function readSchedules(): BackupSchedule[] {
  try { return JSON.parse(fs.readFileSync(BACKUP_SCHEDULES, 'utf8')); } catch { return []; }
}

function writeSchedules(list: BackupSchedule[]) {
  fs.mkdirSync(path.dirname(BACKUP_SCHEDULES), { recursive: true });
  fs.writeFileSync(BACKUP_SCHEDULES, JSON.stringify(list, null, 2));
}

function nextRun(cron: string): string | undefined {
  try {
    const interval = cronParser.parseExpression(cron, { tz: 'Asia/Ho_Chi_Minh' });
    return interval.next().toISOString();
  } catch { return undefined; }
}

// ─── In-memory scheduler ──────────────────────────────────────────────────────

const timers = new Map<string, NodeJS.Timeout>();

function execBackupSilent(cmd: string, diskDest?: string, gdriveDest?: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!fs.existsSync(DB_SCRIPT)) return resolve(false);
    const args = [DB_SCRIPT, 'all'];
    if (diskDest) { args.push('--disk'); args.push(diskDest); }
    if (gdriveDest) { args.push('--gdrive'); args.push(`${gdriveDest}:`); }
    const proc = spawn('bash', args, {
      cwd: path.dirname(DB_SCRIPT),
      env: { ...process.env },
    });
    proc.on('close', code => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function scheduleNext(s: BackupSchedule) {
  if (timers.has(s.id)) { clearTimeout(timers.get(s.id)!); timers.delete(s.id); }
  if (!s.enabled) return;
  const next = nextRun(s.cron);
  if (!next) return;
  const delay = new Date(next).getTime() - Date.now();
  if (delay < 0) return;
  const t = setTimeout(async () => {
    const ok = await execBackupSilent(s.cmd, s.diskDest, s.gdriveDest);
    const list = readSchedules();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx >= 0) {
      list[idx].lastRunAt = new Date().toISOString();
      list[idx].lastRunOk = ok;
      list[idx].nextRunAt = nextRun(s.cron);
      writeSchedules(list);
      scheduleNext(list[idx]);
    }
  }, delay);
  timers.set(s.id, t);
}

function initScheduler() {
  for (const s of readSchedules()) {
    s.nextRunAt = nextRun(s.cron);
    scheduleNext(s);
  }
}

function readEnvFile(): Record<string, string> {
  const config: Record<string, string> = {};
  try {
    const content = fs.readFileSync(BACKUP_ENV, 'utf8');
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx < 0) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      const commentIdx = val.indexOf(' #');
      if (commentIdx >= 0) val = val.slice(0, commentIdx).trim();
      config[key] = val;
    }
  } catch { /* file may not exist */ }
  return config;
}

function maskValue(key: string, val: string): string {
  if (!val) return val;
  if (SENSITIVE_KEYS.some(k => key.toUpperCase().includes(k))) {
    return val.length > 4 ? `${'*'.repeat(val.length - 4)}${val.slice(-4)}` : '****';
  }
  return val;
}

function getMaskedConfig(): Record<string, string> {
  const raw = readEnvFile();
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    masked[k] = maskValue(k, v);
  }
  return masked;
}

export async function backupRoutes(app: FastifyInstance) {
  initScheduler();

  // ─── GET /admin/backup/remotes ────────────────────────────────────────────────
  app.get('/backup/remotes', { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send(listRcloneRemotes());
  });

  // ─── GET /admin/backup/schedules ──────────────────────────────────────────────
  app.get('/backup/schedules', { preHandler: requireAdmin }, async (_req, reply) => {
    const list = readSchedules().map(s => ({ ...s, nextRunAt: nextRun(s.cron) }));
    return reply.send(list);
  });

  // ─── POST /admin/backup/schedules ─────────────────────────────────────────────
  app.post('/backup/schedules', { preHandler: requireAdmin }, async (req, reply) => {
    const { label, cron, cmd = 'run', diskDest, gdriveDest } = req.body as any;
    if (!label || !cron) return reply.status(400).send({ error: 'label và cron là bắt buộc' });
    try { cronParser.parseExpression(cron); } catch {
      return reply.status(400).send({ error: 'Cron expression không hợp lệ' });
    }
    const s: BackupSchedule = {
      id: randomUUID(), label, cron, cmd,
      diskDest: diskDest || undefined,
      gdriveDest: gdriveDest || undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
      nextRunAt: nextRun(cron),
    };
    const list = readSchedules();
    list.push(s);
    writeSchedules(list);
    scheduleNext(s);
    return reply.status(201).send(s);
  });

  // ─── PUT /admin/backup/schedules/:id ──────────────────────────────────────────
  app.put('/backup/schedules/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as any;
    const patch = req.body as Partial<BackupSchedule>;
    const list = readSchedules();
    const idx = list.findIndex(s => s.id === id);
    if (idx < 0) return reply.status(404).send({ error: 'Không tìm thấy' });
    list[idx] = { ...list[idx], ...patch, id };
    list[idx].nextRunAt = nextRun(list[idx].cron);
    writeSchedules(list);
    scheduleNext(list[idx]);
    return reply.send(list[idx]);
  });

  // ─── DELETE /admin/backup/schedules/:id ───────────────────────────────────────
  app.delete('/backup/schedules/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as any;
    const list = readSchedules();
    if (!list.find(s => s.id === id)) return reply.status(404).send({ error: 'Không tìm thấy' });
    if (timers.has(id)) { clearTimeout(timers.get(id)!); timers.delete(id); }
    writeSchedules(list.filter(s => s.id !== id));
    return reply.send({ ok: true });
  });

  // ─── GET /admin/backup/drives ─────────────────────────────────────────────────
  app.get('/backup/drives', { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send(listDrives());
  });

  // ─── POST /admin/backup/exec-db — SSE streaming ───────────────────────────────
  app.post('/backup/exec-db', { preHandler: requireAdmin }, async (req, reply) => {
    const { service = 'all', diskDest, gdriveDest } = req.body as any;
    const validServices = ['all', 'postgres', 'mongo', 'redis', 'minio'];
    if (!validServices.includes(service)) {
      return reply.status(400).send({ error: 'Service không hợp lệ' });
    }
    if (!fs.existsSync(DB_SCRIPT)) {
      return reply.status(503).send({ error: `db-backup.sh không tìm thấy tại: ${DB_SCRIPT}` });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: object) => {
      try { reply.raw.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* client disconnected */ }
    };

    const args = [DB_SCRIPT, service];
    if (diskDest) { args.push('--disk'); args.push(diskDest); }
    if (gdriveDest) { args.push('--gdrive'); args.push(`${gdriveDest}:`); }

    const destDesc = [diskDest ? `disk:${diskDest}` : '', gdriveDest ? `gdrive:${gdriveDest}` : ''].filter(Boolean).join(' ');
    send({ type: 'start', cmd: `db-backup.sh ${service}${destDesc ? ' ' + destDesc : ''}`, time: new Date().toISOString() });

    const proc = spawn('bash', args, {
      cwd: path.dirname(DB_SCRIPT),
      env: { ...process.env },
    });

    proc.stdout.on('data', chunk => send({ type: 'out', line: chunk.toString() }));
    proc.stderr.on('data', chunk => send({ type: 'err', line: chunk.toString() }));
    proc.on('close', code => { send({ type: 'done', code, ok: code === 0 }); reply.raw.end(); });
    proc.on('error', err => { send({ type: 'error', message: err.message }); reply.raw.end(); });
    req.raw.on('close', () => { try { proc.kill(); } catch { /* already dead */ } });
  });

  // ─── GET /admin/backup/dumps — list available dump files ──────────────────────
  app.get('/backup/dumps', { preHandler: requireAdmin }, async (_req, reply) => {
    const DB_DIR = path.dirname(DB_RESTORE_SCRIPT);
    const DUMP_BASE = path.join(DB_DIR, 'dumps');
    const services = ['postgres', 'mongo', 'redis', 'minio'] as const;
    const result: Record<string, { name: string; size: number; mtime: string }[]> = {};

    for (const svc of services) {
      const dir = path.join(DUMP_BASE, svc);
      try {
        if (!fs.existsSync(dir)) { result[svc] = []; continue; }
        const files = fs.readdirSync(dir)
          .filter(f => !f.startsWith('.'))
          .map(f => {
            const stat = fs.statSync(path.join(dir, f));
            return { name: f, size: stat.size, mtime: stat.mtime.toISOString() };
          })
          .sort((a, b) => b.mtime.localeCompare(a.mtime));
        result[svc] = files;
      } catch { result[svc] = []; }
    }
    return reply.send(result);
  });

  // ─── POST /admin/backup/exec-restore — SSE streaming ─────────────────────────
  app.post('/backup/exec-restore', { preHandler: requireAdmin }, async (req, reply) => {
    const { service = 'all', diskDest, gdriveDest } = req.body as any;
    const validServices = ['all', 'postgres', 'mongo', 'redis', 'minio'];
    if (!validServices.includes(service)) {
      return reply.status(400).send({ error: 'Service không hợp lệ' });
    }
    if (!fs.existsSync(DB_RESTORE_SCRIPT)) {
      return reply.status(503).send({ error: `db-restore.sh không tìm thấy tại: ${DB_RESTORE_SCRIPT}` });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: object) => {
      try { reply.raw.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* client disconnected */ }
    };

    const args = [DB_RESTORE_SCRIPT, service];
    if (gdriveDest) { args.push('--gdrive'); args.push(gdriveDest); }
    else if (diskDest) { args.push('--disk'); args.push(diskDest); }

    const srcDesc = gdriveDest ? `gdrive:${gdriveDest}` : (diskDest ? `disk:${diskDest}` : 'local');
    send({ type: 'start', cmd: `db-restore.sh ${service} [${srcDesc}]`, time: new Date().toISOString() });

    const proc = spawn('bash', args, {
      cwd: path.dirname(DB_RESTORE_SCRIPT),
      env: { ...process.env },
    });

    proc.stdout.on('data', chunk => send({ type: 'out', line: chunk.toString() }));
    proc.stderr.on('data', chunk => send({ type: 'err', line: chunk.toString() }));
    proc.on('close', code => { send({ type: 'done', code, ok: code === 0 }); reply.raw.end(); });
    proc.on('error', err => { send({ type: 'error', message: err.message }); reply.raw.end(); });
    req.raw.on('close', () => { try { proc.kill(); } catch { /* already dead */ } });
  });

  // ─── GET /admin/backup/status ─────────────────────────────────────────────────
  app.get('/backup/status', { preHandler: requireAdmin }, async (_req, reply) => {
    const config = getMaskedConfig();

    const rcloneBin = path.join(BACKUP_DIR, config.RCLONE_BINARY || './rclone_bin');
    const scriptExists = fs.existsSync(BACKUP_SCRIPT);
    const rcloneExists = fs.existsSync(rcloneBin) || !!process.env.RCLONE_BIN;

    let logInfo: { size: number; mtime: string; lastLines: string[] } | null = null;
    if (fs.existsSync(BACKUP_LOG)) {
      const stat = fs.statSync(BACKUP_LOG);
      const content = fs.readFileSync(BACKUP_LOG, 'utf8');
      const lines = content.trim().split('\n');
      logInfo = {
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        lastLines: lines.slice(-20),
      };
    }

    return reply.send({ config, scriptExists, rcloneExists, logInfo, backupDir: BACKUP_DIR });
  });

  // ─── POST /admin/backup/exec — SSE streaming ──────────────────────────────────
  app.post('/backup/exec', { preHandler: requireAdmin }, async (req, reply) => {
    const cmd = ((req.body as any)?.cmd ?? 'check') as string;
    if (!['run', 'check', 'verify', 'config', 'version'].includes(cmd)) {
      return reply.status(400).send({ error: 'Lệnh không hợp lệ' });
    }

    if (!fs.existsSync(BACKUP_SCRIPT)) {
      return reply.status(503).send({ error: `backup.sh không tìm thấy tại: ${BACKUP_SCRIPT}` });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (data: object) => {
      try { reply.raw.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* client disconnected */ }
    };

    send({ type: 'start', cmd, time: new Date().toISOString() });

    const proc = spawn('bash', [BACKUP_SCRIPT, cmd], {
      cwd: BACKUP_DIR,
      env: { ...process.env, ENV_FILE: BACKUP_ENV },
    });

    proc.stdout.on('data', chunk => send({ type: 'out', line: chunk.toString() }));
    proc.stderr.on('data', chunk => send({ type: 'err', line: chunk.toString() }));

    proc.on('close', code => {
      send({ type: 'done', code, ok: code === 0 });
      reply.raw.end();
    });

    proc.on('error', err => {
      send({ type: 'error', message: err.message });
      reply.raw.end();
    });

    req.raw.on('close', () => { try { proc.kill(); } catch { /* already dead */ } });
  });

  // ─── GET /admin/backup/logs ───────────────────────────────────────────────────
  app.get('/backup/logs', { preHandler: requireAdmin }, async (req, reply) => {
    const n = Math.min(parseInt((req.query as any)?.lines ?? '200', 10), 1000);

    if (!fs.existsSync(BACKUP_LOG)) {
      return reply.send({ lines: [], exists: false });
    }

    const content = fs.readFileSync(BACKUP_LOG, 'utf8');
    const all = content.trim().split('\n');

    return reply.send({ lines: all.slice(-n), exists: true, total: all.length });
  });
}
