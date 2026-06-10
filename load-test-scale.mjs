/**
 * LMS Scale Load Test — 1,000 → 10,000 users
 *
 * Seed DB trực tiếp (docker exec psql), generate JWT bằng Node.js crypto.
 * Không cần npm install thêm.
 *
 * Usage:
 *   node load-test-scale.mjs                          # 1000 users, concurrency 200
 *   node load-test-scale.mjs --users=5000 --concurrency=500
 *   node load-test-scale.mjs --users=10000 --concurrency=1000
 *   node load-test-scale.mjs --users=1000 --no-seed   # skip DB seed (reuse existing)
 *   node load-test-scale.mjs --cleanup                # xóa seed users và thoát
 */

import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

// ── Parse args ─────────────────────────────────────────────────────────────────
const argv = {};
for (const arg of process.argv.slice(2)) {
  const [k, v] = arg.split('=');
  argv[k] = v ?? true;
}
const TOTAL_USERS  = parseInt(argv['--users']       ?? argv['-u'] ?? '1000');
const CONCURRENCY  = parseInt(argv['--concurrency'] ?? argv['-c'] ?? '200');
const SKIP_SEED    = '--no-seed'  in argv;
const CLEANUP_ONLY = '--cleanup'  in argv;

// ── Constants ──────────────────────────────────────────────────────────────────
const API         = 'http://localhost:4000';
const JWT_SECRET  = '973d02b8db2283bf95a70289c48e2399165eace4b454188f026cb608d27d99b0';
const SEED_PREFIX = 'scaleuser';
const SEED_DOMAIN = '@scale.test';
const PG_CONTAINER= 'lms_postgres';
const PG_USER     = 'admin';
const PG_DB       = 'mydb';

// ── Colors ─────────────────────────────────────────────────────────────────────
const c = {
  rs:'\x1b[0m', bd:'\x1b[1m',
  gr:'\x1b[32m', rd:'\x1b[31m', yw:'\x1b[33m',
  cy:'\x1b[36m', mg:'\x1b[35m', gy:'\x1b[90m',
};
const ok_  = s => `${c.gr}✓${c.rs} ${s}`;
const err_ = s => `${c.rd}✗${c.rs} ${s}`;
const hd   = s => `\n${c.bd}${c.cy}━━ ${s} ━━${c.rs}`;
const dim  = s => `${c.gy}${s}${c.rs}`;

// ── JWT: pure Node.js crypto, no dep ─────────────────────────────────────────
function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now    = Math.floor(Date.now() / 1000);
  const body   = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 4 * 3600 })).toString('base64url');
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

// ── PostgreSQL via docker exec ────────────────────────────────────────────────
function psql(sql) {
  const r = spawnSync('docker', ['exec', '-i', PG_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-t', '-A', '-c', sql], { encoding: 'utf8' });
  if (r.error) throw r.error;
  return r.stdout.trim();
}

function psqlFile(sql) {
  // Pipe a large SQL string via stdin to avoid argument length limits
  const r = spawnSync('docker', ['exec', '-i', PG_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-q'], {
    input: sql, encoding: 'utf8',
  });
  if (r.error) throw r.error;
  return r.stdout;
}

// ── Seed users ────────────────────────────────────────────────────────────────
async function seedUsers(count) {
  console.log(hd(`SEED ${count.toLocaleString()} users vào PostgreSQL`));
  const t0 = Date.now();

  const existing = parseInt(psql(`SELECT COUNT(*) FROM "User" WHERE email LIKE '${SEED_PREFIX}%${SEED_DOMAIN}'`) || '0');
  const needed   = count - existing;
  console.log(`  Existing: ${existing}, Need to create: ${needed}`);

  if (needed > 0) {
    // Build INSERT SQL in batches of 1000 rows
    const BATCH = 1000;
    let inserted = 0;
    const now = new Date().toISOString();

    for (let b = 0; b < Math.ceil(needed / BATCH); b++) {
      const batchSize = Math.min(BATCH, needed - b * BATCH);
      const rows = [];
      for (let j = 0; j < batchSize; j++) {
        const n     = existing + b * BATCH + j + 1;
        const id    = crypto.randomUUID();
        const email = `${SEED_PREFIX}${n}${SEED_DOMAIN}`;
        const name  = `Scale User ${n}`;
        // passwordHash: dummy value (tests use direct JWT, not HTTP login)
        const ph    = 'SCALE_TEST_ONLY';
        rows.push(`('${id}','${email}','${name}','${ph}','STUDENT','${now}','${now}',true,true)`);
      }
      const sql = `INSERT INTO "User" (id,email,name,"passwordHash",role,"createdAt","updatedAt","isVerified","isActive") VALUES ${rows.join(',')} ON CONFLICT (email) DO NOTHING;`;
      psqlFile(sql);
      inserted += batchSize;
      process.stdout.write(`\r  Inserted ${(existing + inserted).toLocaleString()}/${count.toLocaleString()} users...`);
    }
    console.log(`\n  ${ok_(`Created ${needed.toLocaleString()} users — ${Date.now()-t0}ms`)}`);
  }

  // Load all seed users and generate tokens
  const rows = psql(
    `SELECT id, name, role FROM "User" WHERE email LIKE '${SEED_PREFIX}%${SEED_DOMAIN}' ORDER BY email LIMIT ${count}`
  ).split('\n').filter(Boolean);

  const t1 = Date.now();
  const users = rows.map(row => {
    const [id, name, role] = row.split('|');
    return { id, name, role, token: signJWT({ sub: id, role, name }) };
  });
  console.log(`  ${ok_(`${users.length.toLocaleString()} tokens generated — ${Date.now()-t1}ms`)}`);
  console.log(`  ${c.bd}Total setup: ${dim((Date.now()-t0)+'ms')}${c.rs}`);
  return users;
}

async function cleanupUsers() {
  const n = psql(`DELETE FROM "User" WHERE email LIKE '${SEED_PREFIX}%${SEED_DOMAIN}' RETURNING id`).split('\n').filter(Boolean).length;
  console.log(`  ${ok_(`Deleted ${n} seed users`)}`);
}

// ── Core endpoints per user (10 fast reads) ───────────────────────────────────
const ENDPOINTS = [
  ['/auth/me',                  'GET'],
  ['/courses?limit=5',          'GET'],
  ['/language/stats',           'GET'],
  ['/language/vocab-sets',      'GET'],
  ['/math/topics?limit=5',      'GET'],
  ['/math/exercises?limit=3',   'GET'],
  ['/viet/sets',                'GET'],
  ['/quiz',                     'GET'],
  ['/ai/learning-dna',          'GET'],
  ['/notifications',            'GET'],
];

async function runUser(user, bucket) {
  const h = { Authorization: `Bearer ${user.token}` };
  for (const [path, method] of ENDPOINTS) {
    const start = Date.now();
    try {
      const res = await fetch(`${API}${path}`, { method, headers: h, signal: AbortSignal.timeout(15000) });
      const ms  = Date.now() - start;
      const rl  = res.status === 429;
      const ok  = res.status < 400 && !rl;
      try { await res.text(); } catch {}
      bucket.push({ path, ms, ok, rl, status: res.status });
    } catch {
      bucket.push({ path, ms: Date.now() - start, ok: false, rl: false, status: 0 });
    }
  }
}

// ── Concurrency pool ──────────────────────────────────────────────────────────
async function runPool(users, concurrency) {
  const results = [];
  let idx = 0, done = 0;
  const spin = setInterval(() => process.stdout.write(`\r  ${done}/${users.length} users (${(done/users.length*100).toFixed(0)}%)...   `), 400);

  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= users.length) break;
      const bucket = [];
      await runUser(users[i], bucket);
      results.push(...bucket);
      done++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, users.length) }, worker));
  clearInterval(spin);
  process.stdout.write(`\r  ${users.length}/${users.length} users (100%)                   \n`);
  return results;
}

// ── Analyze results ────────────────────────────────────────────────────────────
function analyze(results, elapsedMs) {
  const total  = results.length;
  if (!total) return null;
  const pass   = results.filter(r => r.ok).length;
  const rl     = results.filter(r => r.rl).length;
  const fail   = total - pass - rl;
  const times  = results.map(r => r.ms).sort((a,b) => a - b);
  const avg    = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
  const p50    = times[Math.floor(times.length*0.50)] ?? 0;
  const p95    = times[Math.floor(times.length*0.95)] ?? 0;
  const p99    = times[Math.floor(times.length*0.99)] ?? 0;
  const maxT   = times[times.length-1] ?? 0;
  const rps    = Math.round(total / (elapsedMs/1000));
  const okPct  = (pass/total*100).toFixed(1);
  return { total, pass, rl, fail, avg, p50, p95, p99, maxT, rps, okPct };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${c.bd}${c.mg}╔══════════════════════════════════════════════════════════════╗${c.rs}`);
  console.log(`${c.bd}${c.mg}║  LMS SCALE TEST — ${String(TOTAL_USERS.toLocaleString() + ' users').padEnd(12)} concurrency=${String(CONCURRENCY).padEnd(8)}    ║${c.rs}`);
  console.log(`${c.bd}${c.mg}╚══════════════════════════════════════════════════════════════╝${c.rs}`);
  console.log(`  Total requests: ${c.cy}${(TOTAL_USERS*ENDPOINTS.length).toLocaleString()}${c.rs} | ${c.cy}${new Date().toLocaleString('vi-VN')}${c.rs}\n`);

  if (CLEANUP_ONLY) {
    console.log(hd('CLEANUP'));
    await cleanupUsers();
    return;
  }

  // Health check
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    const d   = await res.json();
    console.log(ok_(`API healthy (${d.status})`));
  } catch { console.log(err_('API không phản hồi')); process.exit(1); }

  // Seed
  const users = SKIP_SEED
    ? (() => {
        const rows = psql(`SELECT id,name,role FROM "User" WHERE email LIKE '${SEED_PREFIX}%${SEED_DOMAIN}' ORDER BY email LIMIT ${TOTAL_USERS}`).split('\n').filter(Boolean);
        return rows.map(row => { const [id,name,role]=row.split('|'); return {id,name,role,token:signJWT({sub:id,role,name})}; });
      })()
    : await seedUsers(TOTAL_USERS);

  if (!users.length) { console.log(err_('Không có users')); process.exit(1); }
  const actualUsers = users.slice(0, TOTAL_USERS);

  // Progressive waves
  const waveSizes = [100, 500, 1000, 2000, 5000, 10000].filter(s => s < actualUsers.length);
  waveSizes.push(actualUsers.length);
  const seen = new Set();
  const waves = waveSizes.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });

  console.log(hd(`PROGRESSIVE LOAD TEST`));
  const summaries = [];

  for (const n of waves) {
    const subset = actualUsers.slice(0, n);
    const conc   = Math.min(CONCURRENCY, n);
    console.log(`\n  ${c.bd}Wave: ${n.toLocaleString()} users, concurrency=${conc}${c.rs}`);
    const t0 = Date.now();
    const results = await runPool(subset, conc);
    const elapsed = Date.now() - t0;
    const s = analyze(results, elapsed);
    if (!s) continue;

    const okC = parseFloat(s.okPct) >= 95 ? c.gr : parseFloat(s.okPct) >= 80 ? c.yw : c.rd;
    console.log(`  ${okC}${s.okPct}%${c.rs} success | ${c.gr}${s.pass}${c.rs}pass ${c.rd}${s.fail}${c.rs}fail ${c.yw}${s.rl}${c.rs}rl | avg:${s.avg}ms p50:${s.p50}ms p95:${s.p95}ms p99:${s.p99}ms max:${s.maxT}ms | ${c.cy}${s.rps} req/s${c.rs}`);
    summaries.push({ n, conc, elapsed, ...s });

    if (n < actualUsers.length) await sleep(3000);
  }

  // Summary table
  console.log(hd('BẢNG TỔNG HỢP'));
  console.log(`\n  ${'Users'.padEnd(9)} ${'Conc'.padEnd(6)} ${'Pass%'.padStart(6)} ${'avg'.padStart(6)} ${'p50'.padStart(6)} ${'p95'.padStart(6)} ${'p99'.padStart(6)} ${'max'.padStart(7)} ${'req/s'.padStart(7)} ${'RL'.padStart(5)}`);
  console.log('  ' + '─'.repeat(82));
  for (const s of summaries) {
    const okC = parseFloat(s.okPct) >= 95 ? c.gr : parseFloat(s.okPct) >= 80 ? c.yw : c.rd;
    console.log(`  ${String(s.n.toLocaleString()).padEnd(9)} ${String(s.conc).padEnd(6)} ${okC}${s.okPct.padStart(5)}%${c.rs} ${String(s.avg).padStart(5)}ms ${String(s.p50).padStart(5)}ms ${String(s.p95).padStart(5)}ms ${String(s.p99).padStart(5)}ms ${String(s.maxT).padStart(6)}ms ${String(s.rps).padStart(7)}/s ${String(s.rl).padStart(5)}`);
  }

  // Final verdict
  const last = summaries[summaries.length - 1];
  if (!last) return;
  const checks = [
    { n: 'Success ≥ 90%',   v: `${last.okPct}%`,   p: parseFloat(last.okPct) >= 90 },
    { n: 'avg < 500ms',     v: `${last.avg}ms`,    p: last.avg  < 500 },
    { n: 'p95 < 2000ms',    v: `${last.p95}ms`,    p: last.p95  < 2000 },
    { n: 'p99 < 5000ms',    v: `${last.p99}ms`,    p: last.p99  < 5000 },
    { n: `${last.rps} req/s`, v: `target: ${ENDPOINTS.length}×${last.n.toLocaleString()}/10s`, p: last.rps >= last.n * ENDPOINTS.length / 30 },
    { n: 'Zero rate-limit', v: `${last.rl} RL`,    p: last.rl   === 0 },
  ];

  console.log(hd(`RELEASE VERDICT @ ${last.n.toLocaleString()} users`));
  console.log('');
  for (const ch of checks) {
    const icon = ch.p ? ok_(ch.n) : err_(ch.n);
    const vc   = ch.p ? c.gr : c.rd;
    console.log(`  ${icon}: ${vc}${c.bd}${ch.v}${c.rs}`);
  }
  const passed = checks.filter(c => c.p).length;
  console.log('\n' + '═'.repeat(65));
  if      (passed >= 5) console.log(`${c.bd}${c.gr}  ✅ SCALE READY — ${passed}/6 checks${c.rs}`);
  else if (passed >= 4) console.log(`${c.bd}${c.yw}  ⚠️  DEGRADED — ${passed}/6 checks${c.rs}`);
  else                  console.log(`${c.bd}${c.rd}  ❌ OVERLOADED — ${passed}/6 checks${c.rs}`);
  console.log('═'.repeat(65) + '\n');
}

main().catch(e => { console.error(err_('Fatal: '+e.message)); console.error(e.stack); process.exit(1); });
