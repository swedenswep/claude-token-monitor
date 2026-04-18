import { useState, useEffect, useRef } from "react";
import { fmtNum } from "../data";

// ---------- tiny sparkline ----------
export function Spark({ data, height = 46, color = "currentColor", fill = true }) {
  const w = 100;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {fill && <path d={area} fill={color} opacity="0.15" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

// ---------- number with flash-on-change ----------
export function LiveNum({ value, format = fmtNum }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return <span className={flash ? "tick" : ""}>{format(value)}</span>;
}

// ---------- Shared cell wrapper (handles hover glow + expansion) ----------
export function Cell({ id, className, onExpand, children, eyebrow, swatch }) {
  const ref = useRef(null);
  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", (e.clientX - r.left) + "px");
    ref.current.style.setProperty("--my", (e.clientY - r.top) + "px");
  };
  return (
    <div
      ref={ref}
      className={`cell ${className}`}
      data-cell-id={id}
      onMouseMove={handleMove}
      onClick={() => onExpand(id)}
    >
      <div className="cell-header">
        <div className="cell-eyebrow">
          {swatch && <span className="swatch" style={swatch ? { background: swatch } : undefined} />}
          {eyebrow}
        </div>
        <div className="cell-expand">
          EXPAND
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 2h4v4M6 14H2v-4M14 2l-6 6M2 14l6-6" />
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}
