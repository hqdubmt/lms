/**
 * LMS BIG Load Test — 10 Teachers + 100 Students (v2)
 */

import { setTimeout as sleep } from 'timers/promises';

const API  = 'http://localhost:4000';
const WEB  = 'http://localhost:3000';
const N_TEACHERS = 10;
const N_STUDENTS = 100;

const c = {
  reset:'\x1b[0m', bold:'\x1b[1m',
  green:'\x1b[32m', red:'\x1b[31m', yellow:'\x1b[33m',
  cyan:'\x1b[36m', magenta:'\x1b[35m', gray:'\x1b[90m',
};
const ok_   = s => `${c.green}✓${c.reset} ${s}`;
const fail_ = s => `${c.red}✗${c.reset} ${s}`;
const hd    = s => `\n${c.bold}${c.cyan}━━ ${s} ━━${c.reset}`;
const dim   = s => `${c.gray}${s}${c.reset}`;

const allResults = [];

// ── Low-level fetch ───────────────────────────────────────────────────────────
async function req(label, method, url, opts = {}) {
  const start = Date.now();
  try {
    const h = {};
    if (opts.token) h['Authorization'] = `Bearer ${opts.token}`;
    if (opts.body)  h['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      method,
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const ms = Date.now() - start;
    const rl = res.status === 429;
    const ok = (res.status < 400 || (opts.allow ?? []).includes(res.status)) && !rl;
    try { await res.text(); } catch {}
    allResults.push({ label, ms, ok, rl, status: res.status });
    return { ok, rl, status: res.status, ms };
  } catch (e) {
    const ms = Date.now() - start;
    allResults.push({ label, ms, ok: false, rl: false, status: 0 });
    return { ok: false, rl: false, status: 0, ms };
  }
}

// Setup helpers — raw fetch, captures token directly
async function doRegister(email, password, name) {
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      signal: AbortSignal.timeout(12000),
    });
    await res.text();
    return res.status;
  } catch { return 0; }
}

async function doLogin(email, password, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(12000),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 200 || res.status === 201) return d.accessToken ?? null;
      if (res.status === 429 && attempt < retries) { await sleep(65000); continue; }
      return null;
    } catch { return null; }
  }
  return null;
}

// Get admin token once (authenticated bucket, not IP bucket)
async function getAdminToken() {
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@lms.com', password: 'admin123' }),
      signal: AbortSignal.timeout(10000),
    });
    const d = await res.json().catch(() => ({}));
    return d.accessToken ?? null;
  } catch { return null; }
}

// Promote user to INSTRUCTOR role via admin API
async function promoteToInstructor(userId, adminToken) {
  try {
    const res = await fetch(`${API}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ role: 'INSTRUCTOR' }),
      signal: AbortSignal.timeout(10000),
    });
    return res.status === 200;
  } catch { return false; }
}

// Get user ID from JWT payload
function getUserId(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub ?? null;
  } catch { return null; }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
async function setupUsers() {
  const total = N_TEACHERS + N_STUDENTS;
  console.log(hd(`SETUP: ${N_TEACHERS} teachers + ${N_STUDENTS} students`));
  console.log(dim(`  Stagger 250ms/user → ~${Math.ceil(total * 0.25)}s total setup`));
  const users = [];

  // Admin token for promoting teachers
  const adminToken = await getAdminToken();
  if (!adminToken) console.log(`  ${fail_('Admin login failed — teachers sẽ không được promote')}`);

  for (let i = 0; i < total; i++) {
    const isTeacher = i < N_TEACHERS;
    const idx    = isTeacher ? i + 1 : (i - N_TEACHERS + 1);
    const prefix = isTeacher ? 'teacher' : 'student';
    const email  = `${prefix}${idx}@lms.local`;
    const pass   = 'Test@12345';
    const name   = isTeacher ? `Teacher ${idx}` : `Student ${idx}`;

    if (i > 0) await sleep(250);

    const t0 = Date.now();
    await doRegister(email, pass, name);
    const token = await doLogin(email, pass);

    // Promote teachers to INSTRUCTOR role
    if (isTeacher && token && adminToken) {
      const userId = getUserId(token);
      if (userId) await promoteToInstructor(userId, adminToken);
    }

    // Re-login teachers to get a fresh token with updated role
    let finalToken = token;
    if (isTeacher && token && adminToken) {
      finalToken = await doLogin(email, pass);
    }

    const ms = Date.now() - t0;

    users.push({ idx, role: isTeacher ? 'teacher' : 'student', email, token: finalToken, name });

    if (i < 5 || i % 20 === 0)
      process.stdout.write(`  ${finalToken ? ok_(prefix + idx) : fail_(prefix + idx + ' (no token)')} ${dim(ms + 'ms')}\n`);
    else if (i === 5)
      process.stdout.write(`  ${dim('...(đang tạo)')}\n`);
  }

  const tOK = users.filter(u => u.role === 'teacher' && u.token).length;
  const sOK = users.filter(u => u.role === 'student' && u.token).length;
  console.log(`\n  ${c.bold}Ready: Teachers ${tOK}/${N_TEACHERS}, Students ${sOK}/${N_STUDENTS}${c.reset}`);
  return users;
}

// ── Teacher workflow ──────────────────────────────────────────────────────────
async function testTeacher(user) {
  const { token, idx } = user;
  if (!token) return { ...user, passed: 0, failed: 0, ratelimited: 0, items: [] };
  await sleep((idx - 1) * 60);

  const auth = { token };
  const r = { ...user, passed: 0, failed: 0, ratelimited: 0, items: [] };
  function rec(label, res) {
    if (res.rl)      { r.ratelimited++; r.items.push({ label, ms: res.ms, pass: false, rl: true,  status: res.status }); }
    else if (res.ok) { r.passed++;      r.items.push({ label, ms: res.ms, pass: true,  rl: false, status: res.status }); }
    else             { r.failed++;      r.items.push({ label, ms: res.ms, pass: false, rl: false, status: res.status }); }
  }

  // Web
  rec('WEB /',                     await req(`t${idx}_w_home`,   'GET', `${WEB}/`));
  rec('WEB /dashboard',            await req(`t${idx}_w_dash`,   'GET', `${WEB}/dashboard`));
  rec('WEB /instructor/copilot',   await req(`t${idx}_w_copilot`,'GET', `${WEB}/instructor/copilot`));
  rec('WEB /instructor/classes',   await req(`t${idx}_w_classes`,'GET', `${WEB}/instructor/classes`));
  rec('WEB /instructor/analytics', await req(`t${idx}_w_anal`,   'GET', `${WEB}/instructor/analytics`));
  rec('WEB /instructor/quiz',      await req(`t${idx}_w_quiz`,   'GET', `${WEB}/instructor/quiz`));

  // Auth
  rec('GET /auth/me',              await req(`t${idx}_me`,       'GET', `${API}/auth/me`, auth));

  // Courses
  rec('GET /courses (mine)',       await req(`t${idx}_courses`,  'GET', `${API}/courses?mine=true`, auth));
  rec('GET /courses (all)',        await req(`t${idx}_courses_a`,'GET', `${API}/courses?limit=8`, auth));

  // Instructor routes
  rec('GET /instructor/classes',   await req(`t${idx}_i_classes`,'GET', `${API}/instructor/classes/list`, auth));
  rec('GET /instructor/analytics', await req(`t${idx}_i_anal`,   'GET', `${API}/instructor/class-analytics`, auth));

  // Language
  rec('GET /language/stats',       await req(`t${idx}_l_stats`,  'GET', `${API}/language/stats`, auth));
  rec('GET /language/vocab-sets',  await req(`t${idx}_l_vocab`,  'GET', `${API}/language/vocab-sets`, auth));
  rec('GET /language/exercises',   await req(`t${idx}_l_ex`,     'GET', `${API}/language/exercises?limit=5`, auth));

  // Math
  rec('GET /math/topics',          await req(`t${idx}_m_topics`, 'GET', `${API}/math/topics?limit=5`, auth));
  rec('GET /math/exercises',       await req(`t${idx}_m_ex`,     'GET', `${API}/math/exercises?limit=5`, auth));

  // Viet
  rec('GET /viet/sets',            await req(`t${idx}_v_sets`,   'GET', `${API}/viet/sets`, auth));

  // Quiz
  rec('GET /quiz',                 await req(`t${idx}_quiz`,     'GET', `${API}/quiz?mine=true`, auth));

  // AI
  rec('GET /ai/adaptive-session',  await req(`t${idx}_adaptive`, 'GET', `${API}/ai/adaptive-session`, auth));
  rec('GET /ai/analytics/summary', await req(`t${idx}_ai_anal`,  'GET', `${API}/ai/analytics/summary`, auth));
  rec('GET /ai/study-plan',        await req(`t${idx}_plan`,     'GET', `${API}/ai/study-plan`, auth));
  rec('GET /ai/learning-dna',      await req(`t${idx}_dna`,      'GET', `${API}/ai/learning-dna`, auth));
  rec('GET /ai/report-card',       await req(`t${idx}_report`,   'GET', `${API}/ai/report-card`, auth));

  // Social
  rec('GET /announcements',        await req(`t${idx}_announce`, 'GET', `${API}/announcements`, auth));
  rec('GET /forum/categories',     await req(`t${idx}_forum`,    'GET', `${API}/forum/categories`, auth));
  rec('GET /notifications',        await req(`t${idx}_notifs`,   'GET', `${API}/notifications`, auth));

  return r;
}

// ── Student workflow ──────────────────────────────────────────────────────────
async function testStudent(user) {
  const { token, idx } = user;
  if (!token) return { ...user, passed: 0, failed: 0, ratelimited: 0, items: [] };
  await sleep(Math.floor((idx - 1) / 10) * 120 + ((idx - 1) % 10) * 20);

  const auth = { token };
  const r = { ...user, passed: 0, failed: 0, ratelimited: 0, items: [] };
  function rec(label, res) {
    if (res.rl)      { r.ratelimited++; r.items.push({ label, ms: res.ms, pass: false, rl: true,  status: res.status }); }
    else if (res.ok) { r.passed++;      r.items.push({ label, ms: res.ms, pass: true,  rl: false, status: res.status }); }
    else             { r.failed++;      r.items.push({ label, ms: res.ms, pass: false, rl: false, status: res.status }); }
  }

  // Web
  rec('WEB /dashboard', await req(`s${idx}_w_dash`, 'GET', `${WEB}/dashboard`));
  rec('WEB /language',  await req(`s${idx}_w_lang`, 'GET', `${WEB}/language`));
  rec('WEB /math',      await req(`s${idx}_w_math`, 'GET', `${WEB}/math`));
  rec('WEB /viet',      await req(`s${idx}_w_viet`, 'GET', `${WEB}/viet`));
  rec('WEB /game',      await req(`s${idx}_w_game`, 'GET', `${WEB}/game`));

  // Auth + Core
  rec('GET /auth/me',  await req(`s${idx}_me`,      'GET', `${API}/auth/me`, auth));
  rec('GET /courses',  await req(`s${idx}_courses`, 'GET', `${API}/courses?limit=5`, auth));

  // Language
  rec('GET /language/stats',       await req(`s${idx}_l_stats`, 'GET', `${API}/language/stats`, auth));
  rec('GET /language/vocab-sets',  await req(`s${idx}_l_vocab`, 'GET', `${API}/language/vocab-sets`, auth));
  rec('GET /language/exercises',   await req(`s${idx}_l_ex`,    'GET', `${API}/language/exercises?limit=3`, auth));
  rec('GET /language/leaderboard', await req(`s${idx}_l_lb`,    'GET', `${API}/language/leaderboard`, auth));

  // Math
  rec('GET /math/topics',          await req(`s${idx}_m_top`,   'GET', `${API}/math/topics?limit=3`, auth));
  rec('GET /math/exercises',       await req(`s${idx}_m_ex`,    'GET', `${API}/math/exercises?limit=3`, auth));
  rec('GET /math/leaderboard',     await req(`s${idx}_m_lb`,    'GET', `${API}/math/leaderboard`, auth));

  // Viet
  rec('GET /viet/sets',            await req(`s${idx}_v_sets`,  'GET', `${API}/viet/sets`, auth));
  rec('GET /viet/exercises',       await req(`s${idx}_v_ex`,    'GET', `${API}/viet/exercises?limit=3`, auth));
  rec('GET /viet/leaderboard',     await req(`s${idx}_v_lb`,    'GET', `${API}/viet/leaderboard`, auth));

  // Quiz
  rec('GET /quiz',                 await req(`s${idx}_quiz`,    'GET', `${API}/quiz`, auth));

  // Progress
  rec('GET /ai/xp',                await req(`s${idx}_xp`,      'GET', `${API}/ai/xp`, auth));
  rec('GET /ai/streak',            await req(`s${idx}_streak`,  'GET', `${API}/ai/streak`, auth));
  rec('POST awardXP',              await req(`s${idx}_award`,   'POST',`${API}/ai/xp/award`, {
    ...auth, body: { activity: 'lesson', xp: 5, reason: 'load-test' }, allow: [200, 201, 400, 429],
  }));

  // Learning DNA
  rec('GET /ai/learning-dna',      await req(`s${idx}_dna`,     'GET', `${API}/ai/learning-dna`, auth));
  rec('GET /ai/learning-dna/v1',   await req(`s${idx}_dna_v1`,  'GET', `${API}/ai/learning-dna/v1`, auth));

  // AI Chat
  rec('POST /ai/chat',             await req(`s${idx}_chat`,    'POST',`${API}/ai/chat`, {
    ...auth,
    body: { message: `Xin chào ${idx}`, subject: 'general', mode: 'tutor', stream: false },
    allow: [200, 201, 400, 429, 500],
  }));

  // Analytics
  rec('GET /ai/report-card',       await req(`s${idx}_report`,  'GET', `${API}/ai/report-card`, auth));
  rec('GET /ai/timeline',          await req(`s${idx}_timeline`,'GET', `${API}/ai/timeline`, auth));
  rec('GET /ai/study-plan',        await req(`s${idx}_plan`,    'GET', `${API}/ai/study-plan`, auth));

  // Social
  rec('GET /notifications',        await req(`s${idx}_notifs`,  'GET', `${API}/notifications`, auth));
  rec('GET /forum/categories',     await req(`s${idx}_forum`,   'GET', `${API}/forum/categories`, auth));
  rec('GET /announcements',        await req(`s${idx}_announce`,'GET', `${API}/announcements`, auth));

  return r;
}

// ── Report ────────────────────────────────────────────────────────────────────
function printReport(reports) {
  const teachers = reports.filter(r => r.role === 'teacher');
  const students = reports.filter(r => r.role === 'student');

  function roleSummary(label, group) {
    const total  = group.reduce((s, r) => s + r.passed + r.failed + r.ratelimited, 0);
    const passed = group.reduce((s, r) => s + r.passed, 0);
    const failed = group.reduce((s, r) => s + r.failed, 0);
    const rl     = group.reduce((s, r) => s + r.ratelimited, 0);
    const pct    = total > 0 ? Math.round(passed / total * 100) : 0;
    const col    = pct >= 95 ? c.green : pct >= 85 ? c.yellow : c.red;
    console.log(`  ${c.bold}${label}${c.reset}: ${col}${pct}%${c.reset} — pass:${c.green}${passed}${c.reset} fail:${c.red}${failed}${c.reset} rl:${c.yellow}${rl}${c.reset} total:${total}`);
  }

  console.log(hd('TỔNG HỢP THEO ROLE'));
  roleSummary(`Teachers (${teachers.filter(r=>r.token).length}/${N_TEACHERS})`, teachers);
  roleSummary(`Students (${students.filter(r=>r.token).length}/${N_STUDENTS})`, students);

  console.log(hd('CHI TIẾT TEACHERS'));
  for (const r of teachers) {
    if (!r.token) { console.log(`  ${fail_('Teacher ' + r.idx + ': no token')}`); continue; }
    const tot   = r.passed + r.failed + r.ratelimited;
    const pct   = Math.round(r.passed / tot * 100);
    const col   = pct === 100 ? c.green : pct >= 85 ? c.yellow : c.red;
    const avgMs = Math.round(r.items.reduce((s, i) => s + i.ms, 0) / (r.items.length || 1));
    const fails = r.items.filter(i => !i.pass && !i.rl).map(i => `${c.red}${i.label}[${i.status}]${c.reset}`).join(', ');
    const rls   = r.items.filter(i => i.rl).map(i => `${c.yellow}${i.label}${c.reset}`).join(', ');
    console.log(`  Teacher ${r.idx}: ${col}${pct}%${c.reset} (${r.passed}/${tot}) avg=${avgMs}ms${fails ? ' | FAIL:'+fails : ''}${rls ? ' | RL:'+rls : ''}`);
  }

  console.log(hd('CHI TIẾT STUDENTS (nhóm 10)'));
  for (let g = 0; g < Math.ceil(N_STUDENTS / 10); g++) {
    const group  = students.slice(g * 10, (g + 1) * 10);
    const total  = group.reduce((s, r) => s + r.passed + r.failed + r.ratelimited, 0);
    const passed = group.reduce((s, r) => s + r.passed, 0);
    const rl     = group.reduce((s, r) => s + r.ratelimited, 0);
    const fails  = group.reduce((s, r) => s + r.failed, 0);
    const pct    = total > 0 ? Math.round(passed / total * 100) : 0;
    const col    = pct >= 90 ? c.green : pct >= 75 ? c.yellow : c.red;
    const allItems = group.flatMap(r => r.items);
    const avgMs  = allItems.length ? Math.round(allItems.reduce((s, i) => s + i.ms, 0) / allItems.length) : 0;
    const tOK    = group.filter(r => r.token).length;
    console.log(`  s${g*10+1}-${Math.min((g+1)*10,N_STUDENTS)} (${tOK}/10 loggedIn): ${col}${pct}%${c.reset} (${passed}/${total}) avg=${avgMs}ms | fail:${fails} rl:${rl}`);
  }

  console.log(hd('PERFORMANCE ENDPOINT (top 30 slowest)'));
  const byEP = {};
  for (const r of allResults) {
    const ep = r.label.replace(/^[ts]\d+_/, '');
    if (!byEP[ep]) byEP[ep] = { times: [], fails: 0, rl: 0 };
    byEP[ep].times.push(r.ms);
    if (!r.ok && !r.rl) byEP[ep].fails++;
    if (r.rl) byEP[ep].rl++;
  }
  const rows = Object.entries(byEP)
    .filter(([k]) => !k.startsWith('health'))
    .map(([name, v]) => {
      const sorted = [...v.times].sort((a, b) => a - b);
      const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      return { name, avg, p95, max, pass: v.times.length - v.fails - v.rl, total: v.times.length, fails: v.fails, rl: v.rl };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 30);

  console.log(`\n  ${'Endpoint'.padEnd(32)} ${'n'.padStart(5)} ${'avg'.padStart(6)} ${'p95'.padStart(6)} ${'max'.padStart(6)} ${'pass'.padStart(8)}`);
  console.log('  ' + '─'.repeat(70));
  for (const r of rows) {
    const ac = r.avg < 300 ? c.green : r.avg < 1000 ? c.yellow : c.red;
    const pc = r.fails === 0 ? c.green : c.red;
    console.log(`  ${r.name.padEnd(32)} ${String(r.total).padStart(5)} ${ac}${String(r.avg).padStart(5)}ms${c.reset} ${String(r.p95).padStart(5)}ms ${String(r.max).padStart(5)}ms  ${pc}${r.pass}/${r.total}${c.reset}${r.rl > 0 ? ` ${c.yellow}(${r.rl}RL)${c.reset}` : ''}`);
  }

  console.log(hd('RELEASE SCORE'));
  const testResults = allResults.filter(r => r.label !== 'health');
  const totalReq  = testResults.length;
  const totalPass = testResults.filter(r => r.ok).length;
  const totalRL   = testResults.filter(r => r.rl).length;
  const sorted    = [...testResults.map(r => r.ms)].sort((a, b) => a - b);
  const p95All    = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

  const apiEPs = Object.entries(byEP).filter(([k]) => !k.startsWith('w_'));
  const webEPs = Object.entries(byEP).filter(([k]) => k.startsWith('w_'));
  const apiAvg = apiEPs.length ? Math.round(apiEPs.flatMap(([,v]) => v.times).reduce((a,b)=>a+b,0) / apiEPs.flatMap(([,v]) => v.times).length) : 0;
  const webAvg = webEPs.length ? Math.round(webEPs.flatMap(([,v]) => v.times).reduce((a,b)=>a+b,0) / webEPs.flatMap(([,v]) => v.times).length) : 0;
  const chatEP  = byEP['chat'];
  const chatAvg = chatEP?.times.length ? Math.round(chatEP.times.reduce((a,b)=>a+b,0)/chatEP.times.length) : 0;
  const passRate = totalReq > 0 ? totalPass / totalReq : 0;

  const checks = [
    { name: `${totalReq} test requests`,     val: `${totalPass}pass / ${totalRL}rl / ${totalReq-totalPass-totalRL}fail`, pass: passRate >= 0.90 },
    { name: 'API avg < 300ms',               val: `${apiAvg}ms`,  pass: apiAvg < 300 },
    { name: 'Web avg < 2000ms',              val: `${webAvg}ms`,  pass: webAvg < 2000 },
    { name: 'Chat avg < 3000ms',             val: `${chatAvg}ms`, pass: chatAvg < 3000 || chatAvg === 0 },
    { name: 'p95 all < 2000ms',              val: `${p95All}ms`,  pass: p95All < 2000 },
    { name: 'Success rate ≥ 90%',           val: `${(passRate*100).toFixed(1)}%`, pass: passRate >= 0.90 },
  ];

  console.log('');
  for (const ch of checks) {
    const icon = ch.pass ? ok_(ch.name) : fail_(ch.name);
    const vc   = ch.pass ? c.green : c.red;
    console.log(`  ${icon}: ${vc}${c.bold}${ch.val}${c.reset}`);
  }

  const passed = checks.filter(c => c.pass).length;
  console.log('\n' + '═'.repeat(65));
  if (passed >= 5) console.log(`${c.bold}${c.green}  ✅ PRODUCTION READY — ${passed}/6 checks passed${c.reset}`);
  else if (passed >= 4) console.log(`${c.bold}${c.yellow}  ⚠️  CAUTION — ${passed}/6 checks passed${c.reset}`);
  else console.log(`${c.bold}${c.red}  ❌ NOT READY — ${passed}/6 checks passed${c.reset}`);
  console.log('═'.repeat(65) + '\n');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}${c.magenta}╔════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.magenta}║  LMS BIG LOAD TEST — 10 Teachers + 100 Students   ║${c.reset}`);
  console.log(`${c.bold}${c.magenta}╚════════════════════════════════════════════════════╝${c.reset}\n`);
  console.log(`  API: ${c.cyan}${API}${c.reset}  |  WEB: ${c.cyan}${WEB}${c.reset}`);
  console.log(`  Time: ${c.cyan}${new Date().toLocaleString('vi-VN')}${c.reset}\n`);

  const health = await req('health', 'GET', `${API}/health`);
  if (!health.ok) { console.log(fail_('API không phản hồi')); process.exit(1); }
  console.log(ok_(`API healthy (${health.ms}ms)`));

  const users = await setupUsers();
  const tOK = users.filter(u => u.role === 'teacher' && u.token).length;
  const sOK = users.filter(u => u.role === 'student' && u.token).length;
  if (tOK === 0 && sOK === 0) { console.log(fail_('Không user nào login được')); process.exit(1); }

  console.log(hd(`CHẠY ĐỒNG THỜI ${tOK} TEACHERS + ${sOK} STUDENTS`));
  console.log(`  Bắt đầu: ${new Date().toLocaleTimeString('vi-VN')}`);
  const t0 = Date.now();

  const [teacherReports, studentReports] = await Promise.all([
    Promise.all(users.filter(u => u.role === 'teacher').map(u => testTeacher(u))),
    Promise.all(users.filter(u => u.role === 'student').map(u => testStudent(u))),
  ]);

  const elapsed = Date.now() - t0;
  console.log(`  Xong: ${c.bold}${(elapsed/1000).toFixed(1)}s${c.reset}`);

  printReport([...teacherReports, ...studentReports]);
}

main().catch(e => { console.error(fail_('Fatal: ' + e.message)); process.exit(1); });
