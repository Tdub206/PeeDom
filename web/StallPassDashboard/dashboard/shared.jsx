// StallPass Business Dashboard — Shared Components
const { useState, useEffect, useContext, createContext, useRef, useCallback } = React;

// ── Toast context ──────────────────────────────────────────
const ToastCtx = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, variant = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, variant }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="sp-toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`sp-toast sp-toast-${t.variant}`}>
            {t.variant === 'success' && <IcoCheck size={15}/>}
            {t.variant === 'danger'  && <IcoX size={15}/>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return useContext(ToastCtx); }

// ── Icons (inline SVG) ─────────────────────────────────────
function Ico({ d, size = 18, stroke = 'currentColor', fill = 'none', strokeWidth = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {typeof d === 'string' ? <path d={d}/> : d}
    </svg>
  );
}

const IcoHome       = ({size=18}) => <Ico size={size} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>;
const IcoBuilding   = ({size=18}) => <Ico size={size} d="M3 21h18M9 8h1m-1 4h1m4-4h1m-1 4h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />;
const IcoChart      = ({size=18}) => <Ico size={size} d="M18 20V10M12 20V4M6 20v-6"/>;
const IcoTag        = ({size=18}) => <Ico size={size} d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01"/>;
const IcoLock       = ({size=18}) => <Ico size={size} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4"/>;
const IcoStar       = ({size=18}) => <Ico size={size} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>;
const IcoFile       = ({size=18}) => <Ico size={size} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcoSettings   = ({size=18}) => <Ico size={size} d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>;
const IcoLogOut     = ({size=18}) => <Ico size={size} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9"/>;
const IcoPlus       = ({size=18}) => <Ico size={size} d="M12 5v14M5 12h14"/>;
const IcoEdit       = ({size=18}) => <Ico size={size} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcoTrash      = ({size=18}) => <Ico size={size} d="M3 6h18 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6 M10 11v6 M14 11v6 M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>;
const IcoCheck      = ({size=18}) => <Ico size={size} d="M20 6L9 17l-5-5"/>;
const IcoX          = ({size=18}) => <Ico size={size} d="M18 6L6 18M6 6l12 12"/>;
const IcoArrowRight = ({size=18}) => <Ico size={size} d="M5 12h14M12 5l7 7-7 7"/>;
const IcoArrowUp    = ({size=18}) => <Ico size={size} d="M12 19V5M5 12l7-7 7 7"/>;
const IcoArrowDown  = ({size=18}) => <Ico size={size} d="M12 5v14M19 12l-7 7-7-7"/>;
const IcoEye        = ({size=18}) => <Ico size={size} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcoEyeOff     = ({size=18}) => <Ico size={size} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24 M1 1l22 22"/>;
const IcoRefresh    = ({size=18}) => <Ico size={size} d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>;
const IcoTrend      = ({size=18}) => <Ico size={size} d="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6"/>;
const IcoBell       = ({size=18}) => <Ico size={size} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0"/>;
const IcoKey        = ({size=18}) => <Ico size={size} d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>;
const IcoSpark      = ({size=18}) => <Ico size={size} d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>;
const IcoUser       = ({size=18}) => <Ico size={size} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z"/>;
const IcoMenu       = ({size=18}) => <Ico size={size} d="M3 12h18M3 6h18M3 18h18"/>;
const IcoTicket     = ({size=18}) => <Ico size={size} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 010 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 010-4V7a2 2 0 00-2-2H5z"/>;

// ── Badge ──────────────────────────────────────────────────
function Badge({ tone = 'neutral', size = 'md', children }) {
  const cls = `sp-badge sp-badge-${tone}${size === 'lg' ? ' sp-badge-lg' : ''}`;
  return <span className={cls}>{children}</span>;
}

// ── Button ─────────────────────────────────────────────────
function Btn({ variant = 'secondary', size, onClick, children, style, disabled, type = 'button' }) {
  const cls = ['sp-btn', `sp-btn-${variant}`, size ? `sp-btn-${size}` : ''].filter(Boolean).join(' ');
  return <button className={cls} onClick={onClick} disabled={disabled} type={type} style={style}>{children}</button>;
}

// ── Section header ─────────────────────────────────────────
function SectionHead({ eyebrow, title, sub, action }) {
  return (
    <div className="sp-section" style={{marginBottom: 20}}>
      {eyebrow && <div className="sp-eyebrow">{eyebrow}</div>}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12}}>
        <div>
          {title && <h2 className="sp-section-title">{title}</h2>}
          {sub   && <p  className="sp-section-sub" style={{marginTop:4}}>{sub}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────
function Card({ children, style, clickable, onClick, className = '' }) {
  const cls = ['sp-card', clickable ? 'sp-card-clickable' : '', className].filter(Boolean).join(' ');
  return <div className={cls} style={style} onClick={onClick}>{children}</div>;
}

// ── Inline editable field ──────────────────────────────────
function EditRow({ label, value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (onSave) onSave(val);
  }
  return (
    <div className="sp-edit-row">
      <span className="sp-edit-key">{label}</span>
      <span className="sp-edit-val">
        {editing
          ? <input ref={ref} className="sp-input-inline" type={type} value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
            />
          : <span onClick={() => setEditing(true)} style={{cursor:'pointer'}}
              title="Click to edit"
              className="sp-input-inline" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setEditing(true); }}
            >{val || <span style={{color:'var(--ink-muted)'}}>—</span>}</span>
        }
      </span>
      {!editing && (
        <button className="sp-btn sp-btn-ghost sp-btn-sm" onClick={() => setEditing(true)} style={{padding:'4px 8px'}}>
          <IcoEdit size={14}/>
        </button>
      )}
    </div>
  );
}

// ── Toggle switch ──────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      {label && <span style={{fontSize:'0.88rem', color:'var(--ink-soft)', fontWeight:500}}>{label}</span>}
      <label className="sp-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
        <span className="sp-toggle-slider"/>
      </label>
    </div>
  );
}

// ── Area chart (SVG) ───────────────────────────────────────
function AreaChart({ data, color = 'var(--brand)', height = 100, labels }) {
  const W = 400; const H = height;
  const pad = { t: 8, b: 8, l: 4, r: 4 };
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
  const pts = data.map((v, i) => [
    pad.l + (i / (data.length - 1)) * iw,
    pad.t + ih - ((v - min) / range) * ih
  ]);
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1][0]},${H-pad.b} L${pts[0][0]},${H-pad.b} Z`;
  const gId = `g${Math.random().toString(36).slice(2,6)}`;
  return (
    <div className="sp-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height, display:'block'}}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map(t => (
          <line key={t} x1={pad.l} x2={W-pad.r}
            y1={pad.t + ih * t} y2={pad.t + ih * t}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"/>
        ))}
        <path d={areaPath} fill={`url(#${gId})`}/>
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} stroke="white" strokeWidth="1.5"/>
        ))}
      </svg>
      {labels && (
        <div className="sp-chart-labels">
          {labels.map((l, i) => <span key={i} className="sp-chart-label">{l}</span>)}
        </div>
      )}
    </div>
  );
}

// ── Sparkline (mini chart) ─────────────────────────────────
function Sparkline({ data, color = 'var(--brand)', width = 72, height = 32 }) {
  if (!data || data.every(v => v === 0)) {
    return <svg width={width} height={height} style={{opacity:0.2}}><line x1={4} y1={height/2} x2={width-4} y2={height/2} stroke={color} strokeWidth={1.5}/></svg>;
  }
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    4 + (i / (data.length - 1)) * (width - 8),
    4 + (height - 8) - ((v - min) / range) * (height - 8)
  ]);
  const d = pts.map((p, i) => `${i===0?'M':'L'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg width={width} height={height} className="sp-sparkline">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Modal ──────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sp-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal">
        <div className="sp-modal-head">
          <h2 className="sp-modal-title">{title}</h2>
          <button className="sp-modal-close" onClick={onClose}><IcoX size={16}/></button>
        </div>
        <div className="sp-modal-body">{children}</div>
        {footer && <div className="sp-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────
function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="sp-empty">
      {icon && <div className="sp-empty-icon">{icon}</div>}
      <div className="sp-empty-title">{title}</div>
      {sub && <p className="sp-empty-sub">{sub}</p>}
      {action}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ label, value, delta, deltaDir = 'up', icon, iconBg = 'var(--brand-soft)', iconColor = 'var(--brand)' }) {
  return (
    <Card>
      <div className="sp-stat">
        {icon && <div className="sp-stat-icon" style={{background: iconBg, color: iconColor}}>{icon}</div>}
        <div className="sp-stat-label">{label}</div>
        <div className="sp-stat-value">{value}</div>
        {delta != null && (
          <div className={`sp-stat-delta${deltaDir === 'down' ? ' down' : ''}`}>
            {deltaDir === 'up' ? <IcoArrowUp size={11}/> : <IcoArrowDown size={11}/>}
            {delta}% vs last week
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Confirm dialog (simple) ────────────────────────────────
function Confirm({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Are you sure?" onClose={onCancel}
      footer={<>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Confirm</Btn>
      </>}>
      <p style={{color:'var(--ink-soft)', fontSize:'0.92rem', lineHeight:1.6}}>{message}</p>
    </Modal>
  );
}

Object.assign(window, {
  ToastProvider, useToast,
  Ico, IcoHome, IcoBuilding, IcoChart, IcoTag, IcoLock, IcoStar, IcoFile,
  IcoSettings, IcoLogOut, IcoPlus, IcoEdit, IcoTrash, IcoCheck, IcoX,
  IcoArrowRight, IcoArrowUp, IcoArrowDown, IcoEye, IcoEyeOff, IcoRefresh,
  IcoTrend, IcoBell, IcoKey, IcoSpark, IcoUser, IcoMenu, IcoTicket,
  Badge, Btn, SectionHead, Card, EditRow, Toggle,
  AreaChart, Sparkline, Modal, EmptyState, StatCard, Confirm,
});
