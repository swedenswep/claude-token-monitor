import { useState, useEffect, useMemo } from "react";
import { MOCK_DATA, fetchUsageData, fmtNum, fmtCost } from "./data";
import { SummaryCell, Chart7dCell, ModelCell, Trend24hCell, CountdownCell, SessionsCell } from "./components/Cells";
import { ExpSummary, ExpChart7d, ExpModel, ExpTrend24h, ExpCountdown, ExpSessions } from "./components/Expanded";
import "./App.css";

// ---- Hooks ----
function useTick(ms = 1000) {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return t;
}

function useData() {
  const [data, setData] = useState(MOCK_DATA);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const real = await fetchUsageData();
      if (!active) return;
      if (real) { setData(real); setIsLive(true); }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { active = false; clearInterval(t); };
  }, []);

  return { data, isLive };
}

function useConfig() {
  const [config, setConfigRaw] = useState(() => {
    try {
      const s = localStorage.getItem("ctm_config");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const setConfig = (upd) => {
    setConfigRaw(prev => {
      const next = typeof upd === "function" ? upd(prev) : upd;
      try { localStorage.setItem("ctm_config", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { config, setConfig };
}

function Timestamp() {
  const t = useTick(1000);
  const ts = t.toLocaleTimeString("en-GB", { hour12: false });
  return <span className="ts">{ts} UTC+8</span>;
}

// ---- Expansion manager (FLIP) ----
function useExpander() {
  const [activeId, setActiveId] = useState(null);
  const [cloneState, setCloneState] = useState(null);

  const expand = (id) => {
    if (activeId) return;
    const source = document.querySelector(`[data-cell-id="${id}"]`);
    if (!source) return;
    const rect = source.getBoundingClientRect();
    source.classList.add("is-source");
    setActiveId(id);
    setCloneState({ rect, phase: "start" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setCloneState(s => ({ ...s, phase: "expanded" })));
    });
  };

  const collapse = () => {
    if (!activeId) return;
    setCloneState(s => ({ ...s, phase: "start" }));
    setTimeout(() => {
      const source = document.querySelector(`[data-cell-id="${activeId}"]`);
      if (source) source.classList.remove("is-source");
      setActiveId(null);
      setCloneState(null);
    }, 560);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") collapse(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  return { activeId, cloneState, expand, collapse };
}

function CloneView({ activeId, cloneState, collapse, data, totals }) {
  if (!activeId || !cloneState) return null;
  const { rect, phase } = cloneState;
  const expanded = phase === "expanded";

  const baseStyle = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };

  let body = null;
  let eyebrow = "";
  if (activeId === "summary")        { body = <ExpSummary data={data} totals={totals} />; eyebrow = "TOTAL USAGE"; }
  else if (activeId === "chart-7d")  { body = <ExpChart7d data={data} />; eyebrow = "7-DAY VOLUME"; }
  else if (activeId === "trend-24h") { body = <ExpTrend24h data={data} />; eyebrow = "24-HOUR TREND"; }
  else if (activeId === "countdown") { body = <ExpCountdown data={data} />; eyebrow = "BILLING CYCLE"; }
  else if (activeId === "sessions")  { body = <ExpSessions data={data} totals={totals} />; eyebrow = "SESSIONS"; }
  else if (activeId.startsWith("model-")) {
    const m = data.models.find(x => x.id === activeId.slice(6));
    body = <ExpModel model={m} totals={totals} />;
    eyebrow = m.name.toUpperCase();
  }

  return (
    <>
      <div className={"backdrop" + (expanded ? " show" : "")} onClick={collapse} />
      <div className={"clone" + (expanded ? " expanded" : "")} style={baseStyle}>
        <div className="cell-header">
          <div className="cell-eyebrow">{eyebrow}</div>
        </div>

        <div className="expanded-hint">press <kbd>ESC</kbd> to close</div>
        <button className="expanded-close" onClick={collapse} aria-label="Close">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3 L13 13 M13 3 L3 13" strokeLinecap="round" />
          </svg>
        </button>

        <div className="expanded-body">{body}</div>
      </div>
    </>
  );
}

// ---------- Onboarding ----------
function OnboardingModal({ onDone }) {
  const [mode, setMode] = useState("pro_max");
  const today = new Date();
  const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const [billingStart, setBillingStart] = useState(defaultStart);
  const [budget, setBudget] = useState("50");

  function submit(e) {
    e.preventDefault();
    onDone({
      mode,
      billing_start: billingStart,
      ...(mode === "api_key" ? { monthly_budget: parseFloat(budget) || 50 } : {}),
    });
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-brand">
          <div className="brand-mark">c</div>
          <div>
            <div className="brand-label" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2.5, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 3 }}>CLAUDE CODE</div>
            <div style={{ fontSize: 19, fontWeight: 620, letterSpacing: "-0.3px" }}>Token Monitor</div>
          </div>
        </div>

        <div className="onboarding-heading">How do you use Claude?</div>
        <div className="onboarding-sub">Choose your plan type to set up the right tracking dashboard.</div>

        <div className="mode-cards">
          <button type="button" className={"mode-card" + (mode === "pro_max" ? " selected" : "")} onClick={() => setMode("pro_max")}>
            <div className="mode-card-icon">◈</div>
            <div className="mode-card-title">Pro / Max Plan</div>
            <div className="mode-card-desc">Tracks weekly quota vs 4-week average and 5-hour rolling window usage.</div>
          </button>
          <button type="button" className={"mode-card" + (mode === "api_key" ? " selected" : "")} onClick={() => setMode("api_key")}>
            <div className="mode-card-icon">⌗</div>
            <div className="mode-card-title">API Key</div>
            <div className="mode-card-desc">Tracks monthly spend against a budget cap. No quota windows.</div>
          </button>
        </div>

        <form className="onboarding-form" onSubmit={submit}>
          <div className="onboarding-field">
            <label className="onboarding-label">Billing cycle starts</label>
            <input
              className="onboarding-input"
              type="date"
              value={billingStart}
              onChange={e => setBillingStart(e.target.value)}
              required
            />
          </div>
          {mode === "api_key" && (
            <div className="onboarding-field">
              <label className="onboarding-label">Monthly budget (USD)</label>
              <div className="onboarding-input-wrap">
                <span className="onboarding-prefix">$</span>
                <input
                  className="onboarding-input with-prefix"
                  type="number"
                  min="1"
                  step="0.01"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          <button className="onboarding-btn" type="submit">Start Monitoring →</button>
        </form>
      </div>
    </div>
  );
}

// ---------- Quota bars ----------
function QuotaBars({ config, data, totals }) {
  if (!config) return null;

  if (config.mode === "api_key") {
    const budget = config.monthly_budget || 50;
    const pct = Math.round((totals.cost / budget) * 100);
    const over = pct > 100;
    const color = over ? "var(--danger)" : pct > 75 ? "var(--warn)" : "var(--accent)";
    return (
      <div className="quota-bars">
        <div className="quota-bar-row">
          <span className="quota-bar-title">THIS MONTH · SPEND VS BUDGET</span>
          <span className="quota-bar-nums">{fmtCost(totals.cost)} / {fmtCost(budget)}</span>
          <span className="quota-bar-pct" style={{ color }}>{pct}%</span>
        </div>
        <div className="quota-bar-track">
          <div className="quota-bar-fill" style={{ width: Math.min(pct, 100) + "%", background: color }} />
        </div>
        {over && <div className="quota-warn">⚠ Monthly budget exceeded</div>}
      </div>
    );
  }

  // Pro/Max mode
  const w = data.weekly;
  const win = data.window_5h;
  if (!w || w.avg_4w === 0) return null;

  const wPct = Math.round((w.current / w.avg_4w) * 100);
  const wOver = wPct > 100;
  const wColor = wOver ? "var(--danger)" : wPct > 75 ? "var(--warn)" : "var(--accent)";

  const winPct = win ? Math.round((win.current / win.avg) * 100) : 0;
  const winOver = winPct > 100;
  const winColor = winOver ? "var(--danger)" : winPct > 75 ? "var(--warn)" : "var(--accent)";

  return (
    <div className="quota-bars two-bars">
      <div className="quota-bar-group">
        <div className="quota-bar-row">
          <span className="quota-bar-title">THIS WEEK VS 4W AVG</span>
          <span className="quota-bar-nums">{fmtNum(w.current)} / avg {fmtNum(w.avg_4w)}</span>
          <span className="quota-bar-pct" style={{ color: wColor }}>{wPct}%</span>
        </div>
        <div className="quota-bar-track">
          <div className="quota-bar-fill" style={{ width: Math.min(wPct, 100) + "%", background: wColor }} />
        </div>
      </div>
      {win && (
        <div className="quota-bar-group">
          <div className="quota-bar-row">
            <span className="quota-bar-title">5H WINDOW VS AVG</span>
            <span className="quota-bar-nums">{fmtNum(win.current)} / avg {fmtNum(win.avg)}</span>
            <span className="quota-bar-pct" style={{ color: winColor }}>{winPct}%</span>
          </div>
          <div className="quota-bar-track">
            <div className="quota-bar-fill" style={{ width: Math.min(winPct, 100) + "%", background: winColor }} />
          </div>
        </div>
      )}
      {(wOver || winOver) && (
        <div className="quota-warn">⚠ Above historical average — may enter extra usage territory</div>
      )}
    </div>
  );
}

// ---------- Tweaks panel ----------
function TweaksPanel({ open, onClose, state, setState, config, setConfig }) {
  const set = (k, v) => setState(prev => ({ ...prev, [k]: v }));
  const setC = (k, v) => setConfig(prev => prev ? { ...prev, [k]: v } : prev);

  return (
    <div className={"tweaks-panel" + (open ? " show" : "")}>
      <div className="tweaks-head">
        <span className="tweaks-title">TWEAKS</span>
        <button className="tweaks-close" onClick={onClose}>×</button>
      </div>

      {config && (
        <>
          <div className="tweak-row">
            <div className="tweak-label">Billing Mode</div>
            <div className="seg">
              <button className={config.mode === "pro_max" ? "active" : ""} onClick={() => setC("mode", "pro_max")}>Pro/Max</button>
              <button className={config.mode === "api_key" ? "active" : ""} onClick={() => setC("mode", "api_key")}>API Key</button>
            </div>
          </div>
          <div className="tweak-row">
            <div className="tweak-label">Billing Start</div>
            <input
              className="tweak-input"
              type="date"
              value={config.billing_start || ""}
              onChange={e => setC("billing_start", e.target.value)}
            />
          </div>
          {config.mode === "api_key" && (
            <div className="tweak-row">
              <div className="tweak-label">Monthly Budget</div>
              <div className="tweak-input-wrap">
                <span className="tweak-input-prefix">$</span>
                <input
                  className="tweak-input with-prefix"
                  type="number"
                  min="1"
                  step="1"
                  value={config.monthly_budget || ""}
                  onChange={e => setC("monthly_budget", parseFloat(e.target.value) || 50)}
                />
              </div>
            </div>
          )}
          <div className="tweak-sep" />
        </>
      )}

      <div className="tweak-row">
        <div className="tweak-label">Theme</div>
        <div className="seg">
          <button className={state.theme === "dark" ? "active" : ""} onClick={() => set("theme", "dark")}>Dark</button>
          <button className={state.theme === "light" ? "active" : ""} onClick={() => set("theme", "light")}>Light</button>
        </div>
      </div>

      <div className="tweak-row">
        <div className="tweak-label">Density</div>
        <div className="seg">
          <button className={state.density === "compact" ? "active" : ""} onClick={() => set("density", "compact")}>Compact</button>
          <button className={state.density === "normal" ? "active" : ""} onClick={() => set("density", "normal")}>Normal</button>
          <button className={state.density === "roomy" ? "active" : ""} onClick={() => set("density", "roomy")}>Roomy</button>
        </div>
      </div>

      <div className="tweak-row">
        <div className="tweak-label">Accent</div>
        <div className="accent-swatches">
          <button data-hue="amber" className={state.accent === "amber" ? "active" : ""} onClick={() => set("accent", "amber")} />
          <button data-hue="iris"  className={state.accent === "iris"  ? "active" : ""} onClick={() => set("accent", "iris")} />
          <button data-hue="mint"  className={state.accent === "mint"  ? "active" : ""} onClick={() => set("accent", "mint")} />
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const { data, isLive } = useData();
  const { activeId, cloneState, expand, collapse } = useExpander();
  const { config, setConfig } = useConfig();

  const [tweaks, setTweaks] = useState({
    theme: "dark",
    density: "normal",
    accent: "amber",
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-density", tweaks.density);
    document.documentElement.setAttribute("data-accent", tweaks.accent);
  }, [tweaks]);

  const totals = useMemo(() => ({
    tokens: data.models.reduce((s, m) => s + m.used, 0),
    cost: data.models.reduce((s, m) => s + (m.used / 1000) * m.cost_per_1k, 0),
    sessions: data.models.reduce((s, m) => s + m.sessions_today, 0),
  }), [data]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">c</div>
          <div className="brand-text">
            <div className="brand-label">CLAUDE CODE</div>
            <div className="brand-title">Token Monitor</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className="live-chip"><span className="live-dot" /> {isLive ? "LIVE · LOCAL" : "MOCK"}</span>
          <Timestamp />
          <button className="tweaks-toggle" onClick={() => setTweaksOpen(o => !o)}>TWEAKS</button>
        </div>
      </div>

      <QuotaBars config={config} data={data} totals={totals} />

      <div className="bento">
        <SummaryCell data={data} totals={totals} onExpand={expand} />
        <Chart7dCell data={data} onExpand={expand} />
        {data.models.map(m => (
          <ModelCell key={m.id} model={m} onExpand={expand} />
        ))}
        <Trend24hCell data={data} onExpand={expand} />
        <CountdownCell data={data} onExpand={expand} />
        <SessionsCell data={data} totals={totals} onExpand={expand} />
      </div>

      <CloneView
        activeId={activeId}
        cloneState={cloneState}
        collapse={collapse}
        data={data}
        totals={totals}
      />

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        state={tweaks}
        setState={setTweaks}
        config={config}
        setConfig={setConfig}
      />

      {!config && <OnboardingModal onDone={setConfig} />}
    </div>
  );
}
