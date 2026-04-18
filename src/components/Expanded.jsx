import { fmtNum, fmtCost, modelColor } from "../data";
import { Spark } from "./Shared";

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: "var(--font-mono)", fontSize: 12 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function ExpSummary({ data, totals }) {
  return (
    <>
      <h2 className="expanded-title">Total usage · this cycle</h2>
      <p className="expanded-sub">A holistic view of your token consumption across all Claude models.</p>
      <div className="expanded-grid">
        <div className="panel span-4">
          <div className="panel-label">Total tokens</div>
          <div className="panel-value">{fmtNum(totals.tokens)}</div>
          <div className="panel-sub">across {data.models.length} models · {totals.sessions} sessions today</div>
        </div>
        <div className="panel span-4">
          <div className="panel-label">Estimated cost</div>
          <div className="panel-value">{fmtCost(totals.cost)}</div>
          <div className="panel-sub">USD · ▲ 12.4% vs last cycle</div>
        </div>
        <div className="panel span-4">
          <div className="panel-label">Avg / session</div>
          <div className="panel-value">{fmtNum(Math.round(totals.tokens / Math.max(totals.sessions, 1)))}</div>
          <div className="panel-sub">tokens · today</div>
        </div>

        <div className="panel span-8">
          <div className="panel-label">Model breakdown</div>
          <table className="log-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Used</th>
                <th>Limit</th>
                <th>Share</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map(m => {
                const share = (m.used / totals.tokens) * 100;
                const cost = (m.used / 1000) * m.cost_per_1k;
                return (
                  <tr key={m.id}>
                    <td><span className={"pip pip-" + m.id} style={{ marginRight: 8 }} /> <span className="mono-num">{m.name}</span></td>
                    <td className="mono-num">{fmtNum(m.used)}</td>
                    <td className="mono-num">{m.limit ? fmtNum(m.limit) : "∞"}</td>
                    <td className="mono-num">{share.toFixed(1)}%</td>
                    <td className="mono-num">{fmtCost(cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="panel span-4">
          <div className="panel-label">Top projects</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {data.projects.slice(0, 6).map(p => (
              <div key={p.name} style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text)" }}>
                  <span>{p.name}</span>
                  <span>{fmtNum(p.tokens)}</span>
                </div>
                <div style={{ height: 4, background: "var(--bg-hover)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (p.share * 100) + "%", background: "var(--accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function ExpChart7d({ data }) {
  const max = Math.max(...data.daily_breakdown.map(d => d.tokens));
  const total = data.daily_breakdown.reduce((s, d) => s + d.tokens, 0);
  const avg = total / data.daily_breakdown.length;
  return (
    <>
      <h2 className="expanded-title">7-day token volume</h2>
      <p className="expanded-sub">Daily consumption across the past week, with stacked model breakdown.</p>
      <div className="expanded-grid">
        <div className="panel span-4">
          <div className="panel-label">7-day total</div>
          <div className="panel-value">{fmtNum(total)}</div>
          <div className="panel-sub">tokens</div>
        </div>
        <div className="panel span-4">
          <div className="panel-label">Daily average</div>
          <div className="panel-value">{fmtNum(Math.round(avg))}</div>
          <div className="panel-sub">tokens / day</div>
        </div>
        <div className="panel span-4">
          <div className="panel-label">Peak day</div>
          <div className="panel-value">{fmtNum(max)}</div>
          <div className="panel-sub">04/17 · Fri</div>
        </div>

        <div className="panel span-12">
          <div className="panel-label">Stacked daily volume · by model</div>
          <StackedBars data={data} />
        </div>

        <div className="panel span-12">
          <div className="panel-label">Detailed breakdown</div>
          <table className="log-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Opus</th>
                <th>Sonnet</th>
                <th>Haiku</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.daily_breakdown.map((d, i) => (
                <tr key={i}>
                  <td className="mono-num">{d.day}</td>
                  <td>{d.label}</td>
                  <td className="mono-num">{fmtNum(data.models[0].daily_7d[i])}</td>
                  <td className="mono-num">{fmtNum(data.models[1].daily_7d[i])}</td>
                  <td className="mono-num">{fmtNum(data.models[2].daily_7d[i])}</td>
                  <td className="mono-num" style={{ color: "var(--text)" }}>{fmtNum(d.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StackedBars({ data }) {
  const colors = {
    opus: "oklch(0.68 0.18 25)",
    sonnet: "oklch(0.82 0.15 75)",
    haiku: "oklch(0.78 0.14 155)",
  };
  const days = data.daily_breakdown.length;
  const max = Math.max(...data.daily_breakdown.map((_, i) =>
    data.models.reduce((s, m) => s + m.daily_7d[i], 0)
  ));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${days}, 1fr)`, gap: 14, marginTop: 18, alignItems: "end", height: 260 }}>
      {data.daily_breakdown.map((d, i) => {
        const segs = data.models.map(m => ({
          id: m.id,
          value: m.daily_7d[i],
        }));
        const total = segs.reduce((s, x) => s + x.value, 0);
        const heightPct = (total / max) * 100;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)" }}>{fmtNum(total)}</div>
            <div style={{
              width: "100%", maxWidth: 54,
              height: heightPct + "%",
              display: "flex", flexDirection: "column",
              borderRadius: "8px 8px 4px 4px",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}>
              {segs.map(s => (
                <div key={s.id} style={{
                  flex: s.value,
                  background: colors[s.id],
                  opacity: 0.9,
                }} />
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{d.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>{d.day}</div>
          </div>
        );
      })}
    </div>
  );
}

export function ExpModel({ model, totals }) {
  const pct = model.limit ? (model.used / model.limit) * 100 : null;
  const remaining = model.limit ? model.limit - model.used : null;
  const cost = (model.used / 1000) * model.cost_per_1k;
  const max24 = Math.max(...model.trend_24h);

  return (
    <>
      <h2 className="expanded-title">
        <span className={"pip pip-" + model.id} style={{ marginRight: 12, verticalAlign: "middle" }} />
        {model.name}
        <span style={{ fontSize: 14, color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginLeft: 14, letterSpacing: 1.5, textTransform: "uppercase" }}>
          {model.tier}
        </span>
      </h2>
      <p className="expanded-sub">Last used {model.last_used} · ${model.cost_per_1k} per 1K tokens</p>

      <div className="expanded-grid">
        <div className="panel span-3">
          <div className="panel-label">Used</div>
          <div className="panel-value">{fmtNum(model.used)}</div>
          <div className="panel-sub">tokens this cycle</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Limit</div>
          <div className="panel-value">{model.limit ? fmtNum(model.limit) : "∞"}</div>
          <div className="panel-sub">{model.limit ? pct.toFixed(1) + "% consumed" : "no cap"}</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Remaining</div>
          <div className="panel-value">{remaining != null ? fmtNum(remaining) : "∞"}</div>
          <div className="panel-sub">{model.limit ? "at current pace: ~" + Math.floor((remaining / model.used) * 18) + "d" : "unmetered"}</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Cost</div>
          <div className="panel-value">{fmtCost(cost)}</div>
          <div className="panel-sub">{((cost / totals.cost) * 100).toFixed(0)}% of total</div>
        </div>

        <div className="panel span-8">
          <div className="panel-label">24-hour trend</div>
          <div style={{ height: 240, marginTop: 16 }}>
            <svg viewBox="0 0 600 240" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <g className="trend-grid">
                {[0, 60, 120, 180, 240].map(y => (
                  <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--border)" strokeDasharray="2 3" />
                ))}
              </g>
              <polyline
                points={model.trend_24h.map((v, i) => {
                  const x = (i / (model.trend_24h.length - 1)) * 600;
                  const y = 240 - (v / max24) * 220 - 10;
                  return `${x},${y}`;
                }).join(" ")}
                fill="none"
                stroke={modelColor(model.id)}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {model.trend_24h.map((v, i) => {
                const x = (i / (model.trend_24h.length - 1)) * 600;
                const y = 240 - (v / max24) * 220 - 10;
                return <circle key={i} cx={x} cy={y} r="3" fill={modelColor(model.id)} />;
              })}
            </svg>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-dim)", marginTop: 4 }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>now</span>
          </div>
        </div>

        <div className="panel span-4">
          <div className="panel-label">Session stats</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
            <KV label="Sessions today"       value={model.sessions_today} />
            <KV label="Avg / session"        value={fmtNum(model.avg_per_session)} />
            <KV label="Peak hour"            value={`${Math.max(...model.trend_24h.map((_, i) => i)).toString().padStart(2, "0")}:00`} />
            <KV label="Last used"            value={model.last_used} />
            <KV label="Rate (tokens/min)"    value={fmtNum(Math.round(model.used / (18 * 24 * 60)))} />
          </div>
        </div>

        <div className="panel span-12">
          <div className="panel-label">Daily volume · last 7 days</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 14, marginTop: 16, height: 140, alignItems: "end" }}>
            {model.daily_7d.map((v, i) => {
              const mx = Math.max(...model.daily_7d);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{fmtNum(v)}</div>
                  <div style={{
                    width: "100%", maxWidth: 42, height: (v / mx) * 100, minHeight: 4,
                    background: modelColor(model.id), opacity: 0.85,
                    borderRadius: "6px 6px 3px 3px",
                  }} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export function ExpTrend24h({ data }) {
  const colors = {
    opus: "oklch(0.68 0.18 25)",
    sonnet: "oklch(0.82 0.15 75)",
    haiku: "oklch(0.78 0.14 155)",
  };
  const allMax = Math.max(...data.models.flatMap(m => m.trend_24h));

  return (
    <>
      <h2 className="expanded-title">24-hour trend</h2>
      <p className="expanded-sub">Hourly token rate across all models — last 24 hours.</p>

      <div className="expanded-grid">
        <div className="panel span-12">
          <div className="panel-label">All models</div>
          <div style={{ height: 340, marginTop: 16 }}>
            <svg viewBox="0 0 800 340" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              <g>
                {[0, 85, 170, 255, 340].map(y => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="var(--border)" strokeDasharray="2 3" />
                ))}
              </g>
              {data.models.map(m => {
                const pts = m.trend_24h.map((v, i) => {
                  const x = (i / (m.trend_24h.length - 1)) * 800;
                  const y = 340 - (v / allMax) * 310 - 15;
                  return `${x},${y}`;
                }).join(" ");
                return (
                  <polyline
                    key={m.id}
                    points={pts}
                    fill="none"
                    stroke={colors[m.id]}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                );
              })}
            </svg>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)" }}>
            {data.models.map(m => (
              <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className={"pip pip-" + m.id} /> {m.name}
              </span>
            ))}
          </div>
        </div>

        {data.models.map(m => (
          <div className="panel span-4" key={m.id}>
            <div className="panel-label">
              <span className={"pip pip-" + m.id} style={{ marginRight: 8 }} />
              {m.name}
            </div>
            <div className="panel-value">{fmtNum(m.trend_24h.reduce((s, v) => s + v, 0) * 1000)}</div>
            <div className="panel-sub">tokens · last 24h · peak {Math.max(...m.trend_24h)}</div>
            <div style={{ marginTop: 14 }}>
              <Spark data={m.trend_24h} color={colors[m.id]} height={60} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ExpCountdown({ data }) {
  const now = new Date();
  const end = new Date(data.billing_cycle_end + "T23:59:59");
  const start = new Date(data.billing_cycle_start + "T00:00:00");
  const total = end - start;
  const elapsed = now - start;
  const remainMs = Math.max(end - now, 0);
  const days = Math.floor(remainMs / 86400000);
  const hours = Math.floor((remainMs % 86400000) / 3600000);
  const mins = Math.floor((remainMs % 3600000) / 60000);
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const elapsedDays = Math.floor(elapsed / 86400000);

  return (
    <>
      <h2 className="expanded-title">Billing cycle</h2>
      <p className="expanded-sub">{data.billing_cycle_label} · {data.plan}</p>

      <div className="expanded-grid">
        <div className="panel span-3">
          <div className="panel-label">Days remaining</div>
          <div className="panel-value">{days}</div>
          <div className="panel-sub">{hours}h {mins}m</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Days elapsed</div>
          <div className="panel-value">{elapsedDays}</div>
          <div className="panel-sub">of {Math.floor(total / 86400000)}</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Cycle progress</div>
          <div className="panel-value">{(progress * 100).toFixed(0)}%</div>
          <div className="panel-sub">elapsed</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Resets</div>
          <div className="panel-value">05/01</div>
          <div className="panel-sub">Fri · 00:00 UTC</div>
        </div>

        <div className="panel span-12">
          <div className="panel-label">Projected vs actual spend</div>
          <div style={{ height: 200, marginTop: 20, position: "relative" }}>
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
              {[0, 50, 100, 150, 200].map(y => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--border)" strokeDasharray="2 3" />
              ))}
              <line x1="0" y1="200" x2="600" y2="20" stroke="var(--text-dim)" strokeWidth="1.5" strokeDasharray="4 4" />
              <polyline
                points="0,200 60,195 120,180 180,155 240,130 300,110 360,85 420,62"
                fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"
              />
              <circle cx="420" cy="62" r="4" fill="var(--accent)" />
            </svg>
            <div style={{ position: "absolute", top: 0, right: 0, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 16 }}>
              <span><span style={{ display: "inline-block", width: 18, borderTop: "1.5px dashed var(--text-dim)", verticalAlign: "middle", marginRight: 6 }} />Projected</span>
              <span><span style={{ display: "inline-block", width: 18, borderTop: "2.5px solid var(--accent)", verticalAlign: "middle", marginRight: 6 }} />Actual</span>
            </div>
          </div>
        </div>

        <div className="panel span-6">
          <div className="panel-label">At current pace</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <KV label="Est. cycle total" value={fmtNum(85_000_000)} />
            <KV label="Est. cycle cost" value="$142.80" />
            <KV label="Opus runway" value="~6 days" />
            <KV label="Sonnet runway" value="~22 days" />
          </div>
        </div>
        <div className="panel span-6">
          <div className="panel-label">Alerts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {data.alerts.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                <span className="tag" style={{ color: a.type === "warn" ? "oklch(0.68 0.18 25)" : "var(--text-muted)" }}>
                  {a.type.toUpperCase()}
                </span>
                <div>
                  <div style={{ color: "var(--text)", lineHeight: 1.5 }}>{a.msg}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: 10.5, marginTop: 2 }}>{a.ts}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function ExpSessions({ data, totals }) {
  return (
    <>
      <h2 className="expanded-title">Session activity · today</h2>
      <p className="expanded-sub">{totals.sessions} sessions across {data.models.length} models.</p>

      <div className="expanded-grid">
        <div className="panel span-3">
          <div className="panel-label">Total sessions</div>
          <div className="panel-value">{totals.sessions}</div>
          <div className="panel-sub">today</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Avg duration</div>
          <div className="panel-value">0:42</div>
          <div className="panel-sub">min:sec</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Longest</div>
          <div className="panel-value">2:31</div>
          <div className="panel-sub">s-8839 · opus</div>
        </div>
        <div className="panel span-3">
          <div className="panel-label">Busiest hour</div>
          <div className="panel-value">11:00</div>
          <div className="panel-sub">38 sessions</div>
        </div>

        <div className="panel span-12">
          <div className="panel-label">Recent sessions</div>
          <table className="log-table" style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Model</th>
                <th>Project</th>
                <th>Tokens</th>
                <th>Duration</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_sessions.map(s => (
                <tr key={s.id}>
                  <td className="mono-num" style={{ color: "var(--text)" }}>{s.id}</td>
                  <td><span className={"tag " + s.model}>{s.model}</span></td>
                  <td>{s.project}</td>
                  <td className="mono-num">{fmtNum(s.tokens)}</td>
                  <td className="mono-num">{s.dur}</td>
                  <td>{s.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
