import { useState, useEffect, useMemo } from "react";
import { fmtNum, fmtCost, pctColor } from "../data";
import { Cell, Spark, LiveNum } from "./Shared";

// ---------- SUMMARY ----------
export function SummaryCell({ data, totals, onExpand }) {
  return (
    <Cell
      id="summary"
      className="summary"
      onExpand={onExpand}
      eyebrow={<>TOTAL USAGE · THIS CYCLE</>}
    >
      <div>
        <div className="summary-headline">
          <div className="summary-num"><LiveNum value={totals.tokens} /></div>
          <div className="summary-unit">tokens</div>
        </div>
        <div className="summary-caption">
          across <b>{data.models.length}</b> models · <b>{totals.sessions}</b> sessions today · <b>{fmtCost(totals.cost)}</b> estimated
        </div>
      </div>
      <div className="summary-split">
        <div className="stat">
          <div className="stat-label">Cost</div>
          <div className="stat-value">{fmtCost(totals.cost)}</div>
          <div className="stat-delta up">▲ 12.4% vs last cycle</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sessions</div>
          <div className="stat-value"><LiveNum value={totals.sessions} format={(n) => n.toString()} /></div>
          <div className="stat-delta">today</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg / session</div>
          <div className="stat-value">{fmtNum(Math.round(totals.tokens / Math.max(totals.sessions, 1)))}</div>
          <div className="stat-delta">tokens</div>
        </div>
      </div>
    </Cell>
  );
}

// ---------- 7-DAY CHART ----------
export function Chart7dCell({ data, onExpand }) {
  const max = Math.max(...data.daily_breakdown.map(d => d.tokens));
  return (
    <Cell
      id="chart-7d"
      className="chart-7d"
      onExpand={onExpand}
      eyebrow={<>7-DAY TOKEN VOLUME</>}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: -8 }}>
        <div>
          <div className="chart-title">Last 7 days</div>
          <div className="chart-meta" style={{ marginTop: 2 }}>{data.billing_cycle_label}</div>
        </div>
        <div className="chart-meta">
          Peak · {fmtNum(max)}
        </div>
      </div>
      <div className="bars-7d">
        {data.daily_breakdown.map((d, i) => {
          const h = (d.tokens / max) * 100;
          const today = i === data.daily_breakdown.length - 1;
          return (
            <div key={i} className={"bar-col" + (today ? " today" : "")}>
              <span className="bar-value">{fmtNum(d.tokens)}</span>
              <div className="bar" style={{ height: "100%" }}>
                <div className="bar-fill" style={{ height: `${h}%` }} />
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </Cell>
  );
}

// ---------- MODEL CELL ----------
export function ModelCell({ model, onExpand }) {
  const pct = model.limit ? (model.used / model.limit) * 100 : 100;
  const unlim = model.limit === null;
  return (
    <Cell
      id={"model-" + model.id}
      className={"model-cell " + model.id}
      onExpand={onExpand}
      eyebrow={
        <>
          <span className={"pip pip-" + model.id} />
          {model.name.toUpperCase()} · <span style={{ color: "var(--text-faint)" }}>{model.tier}</span>
        </>
      }
    >
      <div className="model-name">
        <span className="model-name-main">{model.name}</span>
      </div>
      <div className="model-usage">
        <LiveNum value={model.used} />
        {unlim ? (
          <> <span className="slash">/</span> <span className="unlim">∞</span></>
        ) : (
          <> <span className="slash">/</span> <span className="limit">{fmtNum(model.limit)}</span></>
        )}
      </div>
      <div className="model-bar">
        {unlim ? (
          <div className="model-bar-fill infinite" />
        ) : (
          <div
            className="model-bar-fill"
            style={{
              width: Math.min(pct, 100) + "%",
              background: pctColor(pct),
            }}
          />
        )}
      </div>
      <div className="model-foot">
        <span>{unlim ? "unlimited" : pct.toFixed(1) + "% used"}</span>
        <span><b>{model.sessions_today}</b> sess · {model.last_used}</span>
      </div>
    </Cell>
  );
}

// ---------- 24h TREND ----------
export function Trend24hCell({ data, onExpand }) {
  const series = useMemo(() => {
    return data.models.map(m => ({ id: m.id, name: m.name, data: m.trend_24h }));
  }, [data]);

  const colors = {
    opus: "oklch(0.68 0.18 25)",
    sonnet: "oklch(0.82 0.15 75)",
    haiku: "oklch(0.78 0.14 155)",
  };

  return (
    <Cell
      id="trend-24h"
      className="trend-24h"
      onExpand={onExpand}
      eyebrow={<>24-HOUR TREND</>}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: -8 }}>
        <div>
          <div className="chart-title">Hourly token rate</div>
          <div className="trend-legend">
            {series.map(s => (
              <span key={s.id}>
                <span className="pip" style={{ background: colors[s.id] }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="chart-meta">now · 14:02</div>
      </div>
      <div className="trend-canvas">
        <svg viewBox="0 0 300 160" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <g className="trend-grid">
            {[0, 40, 80, 120, 160].map(y => (
              <line key={y} x1="0" y1={y} x2="300" y2={y} />
            ))}
          </g>
          {series.map(s => {
            const max = Math.max(...s.data);
            const pts = s.data.map((v, i) => {
              const x = (i / (s.data.length - 1)) * 300;
              const y = 160 - (v / max) * 150 - 5;
              return `${x},${y}`;
            }).join(" ");
            return (
              <g key={s.id}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={colors[s.id]}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </Cell>
  );
}

// ---------- COUNTDOWN ----------
export function CountdownCell({ data, onExpand }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(data.billing_cycle_end + "T23:59:59");
  const start = new Date(data.billing_cycle_start + "T00:00:00");
  const total = end - start;
  const elapsed = now - start;
  const remainMs = Math.max(end - now, 0);
  const days = Math.floor(remainMs / (1000 * 60 * 60 * 24));
  const progress = Math.min(Math.max(elapsed / total, 0), 1);

  return (
    <Cell
      id="countdown"
      className="countdown"
      onExpand={onExpand}
      eyebrow={<>BILLING CYCLE</>}
    >
      <div className="countdown-inner">
        <div>
          <div className="countdown-num">{days}</div>
          <div className="countdown-unit">days remaining</div>
        </div>
        <div className="countdown-cycle">
          {data.billing_cycle_label}
        </div>
        <div className="countdown-progress">
          <div className="countdown-progress-fill" style={{ width: (progress * 100) + "%" }} />
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--text-dim)",
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span>{(progress * 100).toFixed(0)}% elapsed</span>
          <span>resets 05/01</span>
        </div>
      </div>
    </Cell>
  );
}

// ---------- SESSIONS ----------
export function SessionsCell({ data, totals, onExpand }) {
  return (
    <Cell
      id="sessions"
      className="sessions"
      onExpand={onExpand}
      eyebrow={<>SESSION ACTIVITY · TODAY</>}
    >
      <div>
        <div className="sessions-num"><LiveNum value={totals.sessions} format={(n) => n.toString()} /></div>
        <div className="sessions-caption">sessions across {data.models.length} models</div>
      </div>
      <div className="session-list">
        {data.recent_sessions.slice(0, 4).map((s, i) => (
          <div key={s.id} className="session-row">
            <span className={"pip pip-" + s.model} />
            <span className="name">{s.project}</span>
            <span className="tk">{fmtNum(s.tokens)}</span>
          </div>
        ))}
      </div>
    </Cell>
  );
}
