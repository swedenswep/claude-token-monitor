import { useState, useEffect, useRef, useMemo } from "react";
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

// ---------- Weekly usage bar ----------
function WeeklyBar({ weekly }) {
  if (!weekly || weekly.avg_4w === 0) return null;
  const { current, avg_4w } = weekly;
  const pct = Math.round(current / avg_4w * 100);
  const over = pct > 100;
  const fillW = Math.min(pct, 100);
  const barColor = over ? "var(--danger)" : pct > 75 ? "var(--warn)" : "var(--accent)";

  return (
    <div className="weekly-bar">
      <div className="weekly-bar-labels">
        <span className="weekly-bar-title">THIS WEEK VS 4W AVG</span>
        <span className="weekly-bar-nums">{fmtNum(current)} / avg {fmtNum(avg_4w)}</span>
        <span className="weekly-bar-pct" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="weekly-bar-track">
        <div className="weekly-bar-fill" style={{ width: fillW + "%", background: barColor }} />
      </div>
    </div>
  );
}

// ---------- Tweaks panel ----------
function TweaksPanel({ open, onClose, state, setState }) {
  const set = (k, v) => {
    setState(prev => ({ ...prev, [k]: v }));
  };
  return (
    <div className={"tweaks-panel" + (open ? " show" : "")}>
      <div className="tweaks-head">
        <span className="tweaks-title">TWEAKS</span>
        <button className="tweaks-close" onClick={onClose}>×</button>
      </div>

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

      <WeeklyBar weekly={data.weekly} />

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
      />
    </div>
  );
}
