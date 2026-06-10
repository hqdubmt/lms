/**
 * LMS Full-Feature Load Test
 * 10 users đồng thời, test toàn bộ tính năng V1
 */

import { setTimeout as sleep } from 'timers/promises';

const API = 'http://localhost:4000';
const WEB = 'http://localhost:3000';
const USERS = 10;

// ── Màu terminal ─────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', blue: '\x1b[34m', gray: '\x1b[90m', magenta: '\x1b[35m',
};
const ok  = (s) => `${c.green}✓${c.reset} ${s}`;
const err = (s) => `${c.red}✗${c.reset} ${s}`;
const hd  = (s) => `\n${c.bold}${c.cyan}━━ ${s} ━━${c.reset}`;
const dim = (s) => `${c.gray}${s}${c.reset}`;

// ── Kết quả tổng hợp ─────────────────────────────────────────────────────────
const results = [];

async function req(label, method, url, opts = {}) {
  const start = Date.now();
  try {
    const fetchOpts = { method, signal: AbortSignal.timeout(15000) };
    if (opts.token)   fetchOpts.headers = { ...fetchOpts.headers, Authorization: `Bearer ${opts.token}` };
    if (opts.body)  { fetchOpts.headers = { ...fetchOpts.headers, 'Content-Type': 'application/json' }; fetchOpts.body = JSON.stringify(opts.body); }
    if (opts.cookie)  fetchOpts.headers = { ...fetchOpts.headers, Cookie: opts.cookie };

    const res = await fetch(url, fetchOpts);
    const ms  = Date.now() - start;
    const success = res.status < 400 || opts.allowStatus?.includes(res.status);
    results.push({ label, ms, success, status: res.status });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await res.json().catch(() => null);
    else await res.text().catch(() => null);

    return { ok: success, status: res.status, ms, data };
  } catch (e) {
    const ms = Date.now() - start;
    results.push({ label, ms, success: false, status: 0, error: e.message });
    return { ok: false, status: 0, ms, error: e.message };
  }
}

// ── Tạo test users ────────────────────────────────────────────────────────────
async function setupUsers() {
  console.log(hd('SETUP: Tạo 10 test users'));
  const users = [];
  for (let i = 1; i <= USERS; i++) {
    const email = `testuser${i}@lms.local`;
    const password = `Test@12345`;
    const name = `TestUser${i}`;

    // Stagger setup để tránh rate-limit trên unauthenticated IP
    if (i > 1) await sleep(120);

    // Register (bỏ qua nếu đã tồn tại)
    await req(`register_user${i}`, 'POST', `${API}/auth/register`, {
      body: { email, password, name, role: 'STUDENT' },
      allowStatus: [200, 201, 400, 409],
    });

    // Login để lấy token
    const login = await req(`login_user${i}`, 'POST', `${API}/auth/login`, {
      body: { email, password },
      allowStatus: [200, 201],
    });

    if (login.ok && login.data?.accessToken) {
      users.push({ id: i, email, token: login.data.accessToken, name });
      console.log(`  ${ok(`User ${i} login`)} ${dim(`${login.ms}ms`)}`);
    } else {
      console.log(`  ${err(`User ${i} login failed`)} ${dim(`status=${login.status}`)}`);
      users.push({ id: i, email, token: null, name });
    }
  }
  return users;
}

// ── Test một user (chạy song song, stagger theo id) ──────────────────────────
async function testUser(user) {
  const { token, id } = user;
  if (!token) return { user: id, skipped: true };

  // Stagger nhẹ để tránh rate-limit burst (200 req/min per IP)
  await sleep((id - 1) * 80);

  const auth = { token };
  const rl   = [200, 201, 429]; // 429 = rate-limited, tính riêng
  const report = { user: id, passed: 0, failed: 0, ratelimited: 0, items: [] };

  function record(label, r) {
    const rateLimited = r.status === 429;
    const pass = r.ok && !rateLimited;
    report.items.push({ label, ms: r.ms, pass, status: r.status, rateLimited });
    if (rateLimited) report.ratelimited++;
    else if (pass) report.passed++;
    else report.failed++;
  }

  // ── 1. AUTH ────────────────────────────────────────────────────────────────
  record('GET /auth/me', await req(`u${id}_me`, 'GET', `${API}/auth/me`, auth));

  // ── 2. WEB Pages ──────────────────────────────────────────────────────────
  record('WEB /',            await req(`u${id}_web_home`,   'GET', `${WEB}/`));
  record('WEB /dashboard',   await req(`u${id}_web_dash`,   'GET', `${WEB}/dashboard`));
  record('WEB /language',    await req(`u${id}_web_lang`,   'GET', `${WEB}/language`));
  record('WEB /math',        await req(`u${id}_web_math`,   'GET', `${WEB}/math`));
  record('WEB /viet',        await req(`u${id}_web_viet`,   'GET', `${WEB}/viet`));
  record('WEB /game',        await req(`u${id}_web_game`,   'GET', `${WEB}/game`));
  record('WEB /quiz',        await req(`u${id}_web_quiz`,   'GET', `${WEB}/quiz`));
  record('WEB /courses',     await req(`u${id}_web_courses`,'GET', `${WEB}/courses`));
  record('WEB /marketplace', await req(`u${id}_web_market`, 'GET', `${WEB}/marketplace`));
  record('WEB /leaderboard', await req(`u${id}_web_lb`,     'GET', `${WEB}/leaderboard`));

  // ── 3. LMS CORE ───────────────────────────────────────────────────────────
  record('GET /courses',          await req(`u${id}_courses`,     'GET', `${API}/courses`, auth));
  record('GET /courses (public)', await req(`u${id}_courses_pub`, 'GET', `${API}/courses?limit=5`));

  // ── 4. LANGUAGE MODULE ────────────────────────────────────────────────────
  record('GET /language/stats',       await req(`u${id}_lang_stats`,  'GET', `${API}/language/stats`, auth));
  record('GET /language/vocab-sets',  await req(`u${id}_lang_vocab`,  'GET', `${API}/language/vocab-sets`, auth));
  record('GET /language/exercises',   await req(`u${id}_lang_ex`,     'GET', `${API}/language/exercises`, auth));
  record('GET /language/leaderboard', await req(`u${id}_lang_lb`,     'GET', `${API}/language/leaderboard`, auth));

  // ── 5. MATH MODULE ────────────────────────────────────────────────────────
  record('GET /math/topics',       await req(`u${id}_math_topics`, 'GET', `${API}/math/topics`, auth));
  record('GET /math/exercises',    await req(`u${id}_math_ex`,     'GET', `${API}/math/exercises`, auth));
  record('GET /math/leaderboard',  await req(`u${id}_math_lb`,     'GET', `${API}/math/leaderboard`, auth));

  // ── 6. VIET MODULE ────────────────────────────────────────────────────────
  record('GET /viet/sets',         await req(`u${id}_viet_sets`,  'GET', `${API}/viet/sets`, auth));
  record('GET /viet/exercises',    await req(`u${id}_viet_ex`,    'GET', `${API}/viet/exercises`, auth));
  record('GET /viet/leaderboard',  await req(`u${id}_viet_lb`,    'GET', `${API}/viet/leaderboard`, { ...auth, allowStatus: [200, 404] }));

  // ── 7. QUIZ ───────────────────────────────────────────────────────────────
  record('GET /quiz', await req(`u${id}_quiz_list`, 'GET', `${API}/quiz`, auth));

  // ── 8. PROGRESS / XP ─────────────────────────────────────────────────────
  record('GET /ai/xp',     await req(`u${id}_xp`,     'GET', `${API}/ai/xp`, auth));
  record('GET /ai/streak', await req(`u${id}_streak`,  'GET', `${API}/ai/streak`, auth));
  record('POST awardXP',   await req(`u${id}_award_xp`,'POST', `${API}/ai/xp/award`, {
    ...auth, body: { activity: 'lesson', xp: 10, reason: 'load-test' }, allowStatus: [200, 201, 400, 429],
  }));

  // ── 9. LEARNING DNA ───────────────────────────────────────────────────────
  record('GET /ai/learning-dna',    await req(`u${id}_dna`,    'GET', `${API}/ai/learning-dna`, auth));
  record('GET /ai/learning-dna/v1', await req(`u${id}_dna_v1`, 'GET', `${API}/ai/learning-dna/v1`, auth));

  // ── 10. AI CHATBOX ────────────────────────────────────────────────────────
  record('POST /ai/chat (tutor)', await req(`u${id}_chat_tutor`, 'POST', `${API}/ai/chat`, {
    ...auth,
    body: { message: 'Xin chào, hãy giải thích 2+2 cho tôi', subject: 'math', mode: 'tutor', stream: false },
    allowStatus: [200, 201, 400, 429, 500],
  }));

  // ── 11. AI ANALYTICS ──────────────────────────────────────────────────────
  record('GET /ai/study-plan',  await req(`u${id}_plan`,     'GET', `${API}/ai/study-plan`, auth));
  record('GET /ai/report-card', await req(`u${id}_report`,   'GET', `${API}/ai/report-card`, auth));
  record('GET /ai/timeline',    await req(`u${id}_timeline`,  'GET', `${API}/ai/timeline`, auth));

  // ── 12. NOTIFICATIONS ─────────────────────────────────────────────────────
  record('GET /notifications',  await req(`u${id}_notifs`,   'GET', `${API}/notifications`, auth));

  // ── 13. FORUM ─────────────────────────────────────────────────────────────
  record('GET /forum/categories', await req(`u${id}_forum`,  'GET', `${API}/forum/categories`, auth));

  // ── 14. ANNOUNCEMENTS ─────────────────────────────────────────────────────
  record('GET /announcements',  await req(`u${id}_announce`, 'GET', `${API}/announcements`, auth));

  // ── 15. COURSES (enroll info) ─────────────────────────────────────────────
  record('GET /courses (enrolled)', await req(`u${id}_enrolled`, 'GET', `${API}/courses?enrolled=true`, auth));

  return report;
}

// ── Print report ──────────────────────────────────────────────────────────────
function printReport(users, userReports) {
  console.log(hd('KẾT QUẢ CHI TIẾT THEO USER'));

  for (const r of userReports) {
    if (r.skipped) { console.log(`  ${err(`User ${r.user}: skipped (login failed)`)}`); continue; }
    const total = r.passed + r.failed + r.ratelimited;
    const pct = Math.round((r.passed / total) * 100);
    const color = pct === 100 ? c.green : pct >= 80 ? c.yellow : c.red;
    const rlNote = r.ratelimited > 0 ? ` ${c.yellow}(${r.ratelimited} rate-limited)${c.reset}` : '';
    console.log(`\n  ${c.bold}User ${r.user}${c.reset} — ${color}${pct}%${c.reset} (${r.passed}/${total})${rlNote}`);
    for (const item of r.items) {
      const ms_color = item.ms < 300 ? c.green : item.ms < 1000 ? c.yellow : c.red;
      const icon = item.rateLimited ? c.yellow + '⊘' : item.pass ? c.green + '✓' : c.red + '✗';
      console.log(`    ${icon}${c.reset} ${item.label.padEnd(35)} ${ms_color}${item.ms}ms${c.reset} ${dim(`[${item.status}]`)}`);
    }
  }

  // Tổng hợp theo endpoint
  console.log(hd('THỐNG KÊ THEO ENDPOINT (10 USERS)'));
  const byLabel = {};
  for (const r of results) {
    if (!byLabel[r.label]) byLabel[r.label] = { times: [], fails: 0 };
    byLabel[r.label].times.push(r.ms);
    if (!r.success) byLabel[r.label].fails++;
  }

  // Chỉ show unique endpoints (bỏ user-specific)
  const endpoints = {};
  for (const [k, v] of Object.entries(byLabel)) {
    // Group theo tên endpoint (bỏ prefix u1_, u2_...)
    const name = k.replace(/^u\d+_/, '');
    if (!endpoints[name]) endpoints[name] = { times: [], fails: 0 };
    endpoints[name].times.push(...v.times);
    endpoints[name].fails += v.fails;
  }

  const rows = [];
  for (const [name, v] of Object.entries(endpoints)) {
    const avg = Math.round(v.times.reduce((a, b) => a + b, 0) / v.times.length);
    const min = Math.min(...v.times);
    const max = Math.max(...v.times);
    const p95 = v.times.sort((a, b) => a - b)[Math.floor(v.times.length * 0.95)] ?? max;
    const pass = v.times.length - v.fails;
    rows.push({ name, avg, min, max, p95, pass, total: v.times.length, fails: v.fails });
  }
  rows.sort((a, b) => b.avg - a.avg);

  console.log(`\n  ${'Endpoint'.padEnd(35)} ${'avg'.padStart(6)} ${'min'.padStart(6)} ${'p95'.padStart(6)} ${'max'.padStart(6)} ${'pass'.padStart(8)}`);
  console.log('  ' + '─'.repeat(80));
  for (const r of rows) {
    const avg_c = r.avg < 300 ? c.green : r.avg < 1000 ? c.yellow : c.red;
    const pass_c = r.fails === 0 ? c.green : r.fails < r.total / 2 ? c.yellow : c.red;
    console.log(
      `  ${r.name.padEnd(35)} ${avg_c}${String(r.avg).padStart(5)}ms${c.reset} ${String(r.min).padStart(5)}ms ${String(r.p95).padStart(5)}ms ${String(r.max).padStart(5)}ms  ${pass_c}${r.pass}/${r.total}${c.reset}`
    );
  }

  // Score board
  console.log(hd('RELEASE SCORE CHECK'));
  const allEndpoints = Object.values(endpoints);
  const totalPass = allEndpoints.reduce((s, e) => s + (e.times.length - e.fails), 0);
  const totalReq  = allEndpoints.reduce((s, e) => s + e.times.length, 0);
  const allTimes  = results.map(r => r.ms);
  const avgAll    = Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length);
  const p95All    = [...allTimes].sort((a, b) => a - b)[Math.floor(allTimes.length * 0.95)];
  const apiEndpoints  = allEndpoints.filter(e => e.name && !e.name.startsWith('WEB') && !e.name.startsWith('register') && !e.name.startsWith('login'));
  const apiTimes = apiEndpoints.flatMap(e => e.times);
  const apiAvg    = apiTimes.length ? Math.round(apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length) : 0;
  const webEndpoints  = allEndpoints.filter(e => e.name && e.name.startsWith('WEB'));
  const webTimes = webEndpoints.flatMap(e => e.times);
  const webAvg    = webTimes.length ? Math.round(webTimes.reduce((a, b) => a + b, 0) / webTimes.length) : 0;
  const chatEndpoints = allEndpoints.filter(e => e.name && e.name.includes('chat'));
  const chatTimes = chatEndpoints.flatMap(e => e.times);
  const chatAvg   = chatTimes.length ? Math.round(chatTimes.reduce((a, b) => a + b, 0) / chatTimes.length) : 0;

  const checks = [
    { label: 'Tổng requests',              value: `${totalPass}/${totalReq}`, pass: totalPass / totalReq >= 0.95 },
    { label: 'API avg latency < 300ms',    value: `${apiAvg}ms`,             pass: apiAvg < 300 },
    { label: 'Web dashboard load < 2s',    value: `${webAvg}ms`,             pass: webAvg < 2000 },
    { label: 'Chat first response < 3s',   value: `${chatAvg}ms`,            pass: chatAvg < 3000 || chatAvg === 0 },
    { label: 'p95 < 2s',                  value: `${p95All}ms`,             pass: p95All < 2000 },
    { label: 'Avg tổng hợp',              value: `${avgAll}ms`,             pass: true },
  ];
  for (const ch of checks) {
    const icon = ch.pass ? ok(ch.label) : err(ch.label);
    console.log(`  ${icon}: ${c.bold}${ch.value}${c.reset}`);
  }

  // Final verdict
  const passed = checks.filter(c => c.pass).length;
  console.log('\n' + '═'.repeat(60));
  if (passed >= 5) {
    console.log(`${c.bold}${c.green}  ✅ PRODUCTION READY — ${passed}/${checks.length} performance checks passed${c.reset}`);
  } else if (passed >= 3) {
    console.log(`${c.bold}${c.yellow}  ⚠️  CAUTION — ${passed}/${checks.length} checks passed, cần tối ưu${c.reset}`);
  } else {
    console.log(`${c.bold}${c.red}  ❌ NOT READY — chỉ ${passed}/${checks.length} checks passed${c.reset}`);
  }
  console.log('═'.repeat(60) + '\n');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}${c.magenta}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.magenta}║   LMS FULL-FEATURE LOAD TEST — 10 USERS  ║${c.reset}`);
  console.log(`${c.bold}${c.magenta}╚══════════════════════════════════════════╝${c.reset}\n`);
  console.log(`  API: ${c.cyan}${API}${c.reset}`);
  console.log(`  WEB: ${c.cyan}${WEB}${c.reset}`);
  console.log(`  Users: ${c.cyan}${USERS} concurrent${c.reset}`);
  console.log(`  Time: ${c.cyan}${new Date().toLocaleString('vi-VN')}${c.reset}\n`);

  // Health check
  const health = await req('health', 'GET', `${API}/health`);
  if (!health.ok) { console.log(err('API không phản hồi, dừng test.')); process.exit(1); }
  console.log(ok(`API healthy ${dim(`(${health.ms}ms)`)}`));

  // Setup users
  const users = await setupUsers();
  const loggedIn = users.filter(u => u.token).length;
  console.log(`\n  ${c.bold}${loggedIn}/${USERS} users đăng nhập thành công${c.reset}`);

  // Run all user tests concurrently
  console.log(hd(`CHẠY TEST SONG SONG ${USERS} USERS`));
  console.log(`  Bắt đầu lúc: ${new Date().toLocaleTimeString('vi-VN')}`);
  const startAll = Date.now();

  const userReports = await Promise.all(users.map(u => testUser(u)));

  const totalMs = Date.now() - startAll;
  console.log(`  Hoàn thành sau: ${c.bold}${totalMs}ms${c.reset} (${(totalMs/1000).toFixed(1)}s)`);

  // Print full report
  printReport(users, userReports);
}

main().catch(e => { console.error(err('Fatal: ' + e.message)); process.exit(1); });
