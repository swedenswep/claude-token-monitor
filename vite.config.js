import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'

// ── Model metadata ──────────────────────────────────────────────────────────
const MODEL_META = {
  'claude-opus-4-5':           { id: 'opus',   name: 'Opus 4.5',   tier: 'Flagship',  ip: 0.015,  op: 0.075 },
  'claude-opus-4-6':           { id: 'opus',   name: 'Opus 4.6',   tier: 'Flagship',  ip: 0.015,  op: 0.075 },
  'claude-opus-4-7':           { id: 'opus',   name: 'Opus 4.7',   tier: 'Flagship',  ip: 0.015,  op: 0.075 },
  'claude-sonnet-4-5':         { id: 'sonnet', name: 'Sonnet 4.5', tier: 'Workhorse', ip: 0.003,  op: 0.015 },
  'claude-sonnet-4-6':         { id: 'sonnet', name: 'Sonnet 4.6', tier: 'Workhorse', ip: 0.003,  op: 0.015 },
  'claude-haiku-4-5':          { id: 'haiku',  name: 'Haiku 4.5',  tier: 'Fast',      ip: 0.0008, op: 0.004 },
  'claude-haiku-4-5-20251001': { id: 'haiku',  name: 'Haiku 4.5',  tier: 'Fast',      ip: 0.0008, op: 0.004 },
};

function modelInfo(fullId) {
  if (MODEL_META[fullId]) return MODEL_META[fullId];
  for (const [k, v] of Object.entries(MODEL_META)) {
    if (fullId.startsWith(k)) return v;
  }
  return { id: fullId, name: fullId, tier: 'Unknown', ip: 0.003, op: 0.015 };
}

// ── Path helpers ─────────────────────────────────────────────────────────────
function findActualPath(base, relSlug) {
  if (!relSlug) return base;
  const parts = relSlug.split('-');

  function walk(cur, idx) {
    if (idx >= parts.length) return cur;
    for (let len = parts.length - idx; len >= 1; len--) {
      const name = parts.slice(idx, idx + len).join('-');
      const full = path.join(cur, name);
      try {
        if (fs.statSync(full).isDirectory()) {
          const res = walk(full, idx + len);
          if (res) return res;
        }
      } catch { /* skip */ }
    }
    return null;
  }
  return walk(base, 0);
}

function slugToProjectName(slug) {
  const home = os.homedir();
  const homeSlug = home.replace(/\//g, '-'); // e.g. -Users-allan
  const rel = slug.startsWith(homeSlug)
    ? slug.slice(homeSlug.length).replace(/^-/, '')
    : slug.replace(/^-/, '');

  const actual = findActualPath(home, rel);
  if (actual) return path.basename(actual);

  // Fallback: strip common top-level dirs, take last meaningful segment
  const parts = rel.split('-');
  const skip = new Set(['Desktop', 'Downloads', 'Documents', 'Library', 'Mobile', 'iCloud']);
  // Walk until we hit something not in skip, then take the rest
  let i = 0;
  while (i < parts.length - 1 && skip.has(parts[i])) i++;
  // Take up to 4 remaining parts to avoid overly long names
  return parts.slice(i, i + 4).join('-') || slug;
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function localDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localHour(ts) {
  const d = new Date(ts);
  return `${localDate(d)}T${String(d.getHours()).padStart(2,'0')}`;
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`;
}

// ── JSONL reader ──────────────────────────────────────────────────────────────
async function readJsonl(filePath) {
  const out = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return out;
}

// ── Core aggregation ──────────────────────────────────────────────────────────
async function aggregateUsage() {
  const home = os.homedir();
  const projectsDir = path.join(home, '.claude', 'projects');
  if (!fs.existsSync(projectsDir)) throw new Error('~/.claude/projects not found');

  const now = new Date();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = localDate(now);

  // { modelId: { name, tier, ip, op, input, output, cacheRead, cacheWrite,
  //              byDay, byHour, sessions, sessionsToday, lastUsed } }
  const mStats = {};
  const pStats = {}; // { projName: tokens }
  const rawSessions = [];

  const files = [];
  for (const slug of fs.readdirSync(projectsDir)) {
    const dir = path.join(projectsDir, slug);
    try { if (!fs.statSync(dir).isDirectory()) continue; } catch { continue; }
    const proj = slugToProjectName(slug);
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.jsonl')) {
        files.push({ filePath: path.join(dir, f), proj, sid: f.replace('.jsonl', '') });
      }
    }
  }

  for (const { filePath, proj, sid } of files) {
    let sessIn = 0, sessOut = 0, sessMid = null, sessFirst = null, sessLast = null;

    let lines;
    try { lines = await readJsonl(filePath); } catch { continue; }

    for (const obj of lines) {
      if (obj.type !== 'assistant' || !obj.message?.usage) continue;
      const ts = new Date(obj.timestamp);
      const inCycle = ts >= cycleStart;

      const info = modelInfo(obj.message.model || '');
      const mid = info.id;
      if (!mStats[mid]) {
        mStats[mid] = {
          name: info.name, tier: info.tier, ip: info.ip, op: info.op,
          input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
          byDay: {}, byHour: {}, sessions: new Set(), sessionsToday: new Set(), lastUsed: null,
        };
      }

      const u = obj.message.usage;
      const inp = u.input_tokens || 0;
      const out = u.output_tokens || 0;
      const cr  = u.cache_read_input_tokens || 0;
      const cw  = u.cache_creation_input_tokens || 0;
      const tok = inp + out;

      if (inCycle) {
        const m = mStats[mid];
        m.input += inp; m.output += out; m.cacheRead += cr; m.cacheWrite += cw;
        m.sessions.add(sid);
        const dk = localDate(ts);
        if (dk === today) m.sessionsToday.add(sid);
        m.byDay[dk] = (m.byDay[dk] || 0) + tok;
        m.byHour[localHour(ts)] = (m.byHour[localHour(ts)] || 0) + tok;
        if (!m.lastUsed || ts > new Date(m.lastUsed)) m.lastUsed = ts.toISOString();
        pStats[proj] = (pStats[proj] || 0) + tok;
      }

      sessIn += inp; sessOut += out; sessMid = mid;
      if (!sessFirst || ts < sessFirst) sessFirst = ts;
      if (!sessLast  || ts > sessLast)  sessLast  = ts;
    }

    if ((sessIn + sessOut) > 0) {
      rawSessions.push({
        id: 's-' + sid.slice(0, 4),
        model: sessMid,
        project: proj,
        tokens: sessIn + sessOut,
        when: timeAgo(sessLast),
        dur: sessFirst && sessLast ? fmtDur(sessLast - sessFirst) : '—',
        _ts: sessLast,
      });
    }
  }

  // ── Build model list ────────────────────────────────────────────────────────
  const ORDER = ['opus', 'sonnet', 'haiku'];
  const models = ORDER.filter(id => mStats[id]).map(id => {
    const m = mStats[id];
    const used = m.input + m.output;
    const cost = (m.input * m.ip + m.output * m.op
                + m.cacheRead  * m.ip * 0.1
                + m.cacheWrite * m.ip * 1.25) / 1000;
    const blended = used > 0 ? cost / used * 1000 : m.ip;

    const trend_24h = [];
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 3_600_000);
      trend_24h.push(m.byHour[localHour(h)] || 0);
    }

    const daily_7d = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      daily_7d.push(m.byDay[localDate(d)] || 0);
    }

    return {
      id,
      name: m.name,
      tier: m.tier,
      used,
      limit: null,
      cost_per_1k: blended,
      sessions_today: m.sessionsToday.size,
      avg_per_session: m.sessions.size > 0 ? Math.round(used / m.sessions.size) : 0,
      last_used: m.lastUsed ? timeAgo(m.lastUsed) : 'never',
      trend_24h,
      daily_7d,
    };
  });

  // ── Daily breakdown (last 7 days) ───────────────────────────────────────────
  const daily_breakdown = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dk = localDate(d);
    const label = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const tokens = Object.values(mStats).reduce((s, m) => s + (m.byDay[dk] || 0), 0);
    daily_breakdown.push({ day: dk.slice(5).replace('-', '/'), label, tokens });
  }

  // ── Projects ────────────────────────────────────────────────────────────────
  const totalTok = Object.values(pStats).reduce((s, v) => s + v, 0);
  const projects = Object.entries(pStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, tokens]) => ({ name, tokens, share: totalTok > 0 ? tokens / totalTok : 0 }));

  // ── Recent sessions ─────────────────────────────────────────────────────────
  const recent_sessions = rawSessions
    .sort((a, b) => b._ts - a._ts)
    .slice(0, 8)
    .map(({ _ts, ...s }) => s);

  // ── Billing cycle label ─────────────────────────────────────────────────────
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const pad = n => String(n).padStart(2, '0');
  const y = now.getFullYear(), mo = now.getMonth() + 1;
  const cycleStartStr = `${y}-${pad(mo)}-01`;
  const cycleEndStr   = `${y}-${pad(mo)}-${pad(cycleEnd.getDate())}`;

  return {
    plan: 'Claude Pro + Claude Code',
    billing_cycle_start: cycleStartStr,
    billing_cycle_end:   cycleEndStr,
    billing_cycle_label: `${cycleStartStr} – ${cycleEndStr}`,
    models,
    daily_breakdown,
    recent_sessions,
    alerts: [],
    projects,
  };
}

// ── Simple in-memory cache (15 s TTL) ────────────────────────────────────────
let _cache = null, _cacheAt = 0;
async function getCached() {
  if (_cache && Date.now() - _cacheAt < 15_000) return _cache;
  _cache = await aggregateUsage();
  _cacheAt = Date.now();
  return _cache;
}

// ── Vite plugin ───────────────────────────────────────────────────────────────
function claudeUsagePlugin() {
  return {
    name: 'claude-usage-api',
    configureServer(server) {
      server.middlewares.use('/api/usage', async (_req, res) => {
        try {
          const data = await getCached();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), claudeUsagePlugin()],
})
