// Mock data — mirrors the original + extras for expanded views
export const MOCK_DATA = {
  plan: "Claude Pro + Claude Code",
  billing_cycle_start: "2026-04-01",
  billing_cycle_end: "2026-04-30",
  billing_cycle_label: "2026/04/01 – 2026/04/30",

  models: [
    {
      id: "opus",
      name: "Opus 4",
      tier: "Flagship",
      used: 1_847_320,
      limit: 5_000_000,
      cost_per_1k: 0.015,
      sessions_today: 12,
      avg_per_session: 18_400,
      last_used: "14 min ago",
      trend_24h: [62, 58, 71, 45, 82, 67, 90, 73, 55, 88, 94, 78, 61, 85, 92, 70, 64, 77, 83, 69, 91, 56, 74, 87],
      daily_7d: [180000, 240000, 210000, 310000, 180000, 290000, 220000],
    },
    {
      id: "sonnet",
      name: "Sonnet 4",
      tier: "Workhorse",
      used: 12_340_800,
      limit: 45_000_000,
      cost_per_1k: 0.003,
      sessions_today: 47,
      avg_per_session: 8_200,
      last_used: "2 min ago",
      trend_24h: [30, 42, 55, 38, 61, 72, 45, 58, 67, 80, 43, 56, 69, 75, 82, 48, 63, 71, 59, 84, 77, 50, 66, 88],
      daily_7d: [1500000, 2100000, 1300000, 2800000, 2100000, 3200000, 1800000],
    },
    {
      id: "haiku",
      name: "Haiku 4.5",
      tier: "Fast",
      used: 38_291_000,
      limit: null,
      cost_per_1k: 0.00025,
      sessions_today: 183,
      avg_per_session: 2_100,
      last_used: "just now",
      trend_24h: [45, 52, 67, 78, 55, 63, 82, 90, 71, 58, 85, 92, 60, 73, 88, 95, 68, 76, 81, 70, 87, 93, 79, 96],
      daily_7d: [500000, 1080000, 380000, 1600000, 870000, 1790000, 820000],
    },
  ],

  daily_breakdown: [
    { day: "04/12", label: "Sun", tokens: 2_180_000 },
    { day: "04/13", label: "Mon", tokens: 3_420_000 },
    { day: "04/14", label: "Tue", tokens: 1_890_000 },
    { day: "04/15", label: "Wed", tokens: 4_710_000 },
    { day: "04/16", label: "Thu", tokens: 3_150_000 },
    { day: "04/17", label: "Fri", tokens: 5_280_000 },
    { day: "04/18", label: "Sat", tokens: 2_840_000 },
  ],

  recent_sessions: [
    { id: "s-8842", model: "haiku",  project: "claude-code-monitor",  tokens: 4_200,  when: "just now",   dur: "0:12" },
    { id: "s-8841", model: "sonnet", project: "api-gateway-refactor", tokens: 12_400, when: "2 min ago",  dur: "1:08" },
    { id: "s-8840", model: "sonnet", project: "claude-code-monitor",  tokens: 8_900,  when: "6 min ago",  dur: "0:47" },
    { id: "s-8839", model: "opus",   project: "design-review-bot",    tokens: 21_800, when: "14 min ago", dur: "2:31" },
    { id: "s-8838", model: "haiku",  project: "readme-generator",     tokens: 1_950,  when: "18 min ago", dur: "0:06" },
    { id: "s-8837", model: "sonnet", project: "test-migration",       tokens: 6_400,  when: "24 min ago", dur: "0:38" },
    { id: "s-8836", model: "haiku",  project: "claude-code-monitor",  tokens: 2_100,  when: "31 min ago", dur: "0:09" },
    { id: "s-8835", model: "opus",   project: "arch-decisions",       tokens: 18_200, when: "45 min ago", dur: "1:52" },
  ],

  alerts: [
    { type: "warn", msg: "Opus 用量已達 36.9% — 預計 04/24 耗盡", ts: "12:41" },
    { type: "info", msg: "Haiku 無上限，目前花費 $9.57", ts: "14:02" },
  ],

  projects: [
    { name: "claude-code-monitor", tokens: 4_280_000, share: 0.28 },
    { name: "api-gateway-refactor", tokens: 3_510_000, share: 0.23 },
    { name: "design-review-bot",    tokens: 2_890_000, share: 0.19 },
    { name: "test-migration",       tokens: 1_640_000, share: 0.11 },
    { name: "readme-generator",     tokens: 1_210_000, share: 0.08 },
    { name: "misc. sessions",       tokens: 1_750_000, share: 0.11 },
  ],
};

// Helpers
export function fmtNum(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(n >= 100_000 ? 0 : 1) + "K";
  return n.toLocaleString();
}

export function fmtCost(n) {
  if (n < 1) return "$" + n.toFixed(3);
  return "$" + n.toFixed(2);
}

export function modelColor(id) {
  return {
    opus: "oklch(0.68 0.18 25)",
    sonnet: "oklch(0.82 0.15 75)",
    haiku: "oklch(0.78 0.14 155)",
  }[id];
}

export function pctColor(pct) {
  if (pct > 85) return "oklch(0.68 0.18 25)";
  if (pct > 60) return "oklch(0.82 0.15 75)";
  return "var(--accent)";
}
