// Screens for Outage Tracker. Relies on globals: OPERATORS, OUTAGES, DEFAULT_SOURCES, STATES, AusMap, palette via prop.

const fmtTime = (ms) => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
};
const fmtDateTime = (ms) => {
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-AU', { day:'2-digit', month:'short' })} ${fmtTime(ms)}`;
};
const fmtAgo = (ms) => {
  const diff = Date.now() - ms;
  const sign = diff >= 0 ? '' : '−';
  const abs = Math.abs(diff);
  const m = Math.floor(abs / 60_000);
  if (m < 60) return `${sign}${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${sign}${h}h ${m % 60}m`;
  const days = Math.floor(h / 24);
  return `${sign}${days}d ${h % 24}h`;
};
const fmtNum = (n) => n.toLocaleString('en-AU');

window.fmtTime = fmtTime; window.fmtDateTime = fmtDateTime; window.fmtAgo = fmtAgo; window.fmtNum = fmtNum;

// ---------- Severity badge ----------
function SevBadge({ status, palette }) {
  const map = {
    'Investigating':   palette.high,
    'Crew dispatched': palette.med,
    'Crew on site':    palette.med,
    'Power restored':  palette.ok,
    'Scheduled':       palette.low,
  };
  const c = map[status] || palette.dim;
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '3px 7px', border: `1px solid ${c}`, color: c,
      borderRadius: 2, whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

// ---------- Outage row (compact / comfortable) ----------
function OutageRow({ o, palette, density, onOpen, selected }) {
  const op = OPERATORS.find(x => x.id === o.operator);
  const py = density === 'compact' ? 6 : 10;
  return (
    <div onClick={() => onOpen(o)} style={{
      display: 'grid',
      gridTemplateColumns: '120px 60px 1fr 140px 90px 130px 110px',
      gap: 12, padding: `${py}px 14px`, alignItems: 'center', cursor: 'pointer',
      borderBottom: `1px solid ${palette.borderSoft}`,
      background: selected ? palette.rowSelected : 'transparent',
      fontSize: 13,
    }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = palette.rowHover; }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{o.id}</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: palette.fg }}>{o.state}</span>
      <span style={{ color: palette.fg }}>{o.suburb} <span style={{ color: palette.dim, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{o.postcode}</span></span>
      <span style={{ color: palette.fg, fontSize: 12 }}>{op?.name}</span>
      <span style={{ color: palette.fg, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{fmtNum(o.customers)}</span>
      <span style={{ color: palette.fg, fontSize: 12 }}>{o.cause}</span>
      <SevBadge status={o.status} palette={palette}/>
    </div>
  );
}

// ---------- Stat block ----------
function Stat({ label, value, sub, palette, accent }) {
  return (
    <div style={{
      flex: 1, padding: '14px 18px', border: `1px solid ${palette.border}`,
      background: palette.surface,
    }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 28, fontWeight: 600, color: accent || palette.fg, marginTop: 4, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ---------- Filters bar ----------
function FiltersBar({ filters, setFilters, palette }) {
  const fieldStyle = {
    background: palette.surface, color: palette.fg, border: `1px solid ${palette.border}`,
    padding: '6px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
    borderRadius: 0, height: 32,
  };
  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${palette.border}`, background: palette.surfaceAlt, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter</span>
      <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} style={fieldStyle}>
        <option value="">All states</option>
        {STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
      </select>
      <select value={filters.operator} onChange={e => setFilters({ ...filters, operator: e.target.value })} style={fieldStyle}>
        <option value="">All operators</option>
        {OPERATORS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select value={filters.cause} onChange={e => setFilters({ ...filters, cause: e.target.value })} style={fieldStyle}>
        <option value="">Any cause</option>
        {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={fieldStyle}>
        <option value="">Any status</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input
        placeholder="suburb / postcode / id"
        value={filters.q}
        onChange={e => setFilters({ ...filters, q: e.target.value })}
        style={{ ...fieldStyle, flex: 1, minWidth: 200 }}
      />
      <button onClick={() => setFilters({ state: '', operator: '', cause: '', status: '', q: '' })}
        style={{ ...fieldStyle, cursor: 'pointer', color: palette.dim }}>clear</button>
    </div>
  );
}

function applyFilters(rows, f) {
  return rows.filter(r => {
    if (f.state && r.state !== f.state) return false;
    if (f.operator && r.operator !== f.operator) return false;
    if (f.cause && r.cause !== f.cause) return false;
    if (f.status && r.status !== f.status) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (!(r.suburb.toLowerCase().includes(q) ||
            String(r.postcode).includes(q) ||
            r.id.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

// ---------- Tabs header ----------
function TabsHeader({ tab, setTab, palette }) {
  const now = Date.now();
  const items = [
    { id: 'live',    label: 'Live',    count: OUTAGES.filter(o => o.type === 'live' || (o.type === 'planned' && o.startedAt <= now && o.etr > now)).length },
    { id: 'planned', label: 'Planned', count: OUTAGES.filter(o => o.type === 'planned' && o.startedAt > now).length },
    { id: 'history', label: 'History', count: OUTAGES.filter(o => o.type === 'history').length },
  ];
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${palette.border}`, background: palette.surface }}>
      {items.map(it => (
        <button key={it.id} onClick={() => setTab(it.id)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 22px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
          color: tab === it.id ? palette.fg : palette.dim,
          borderBottom: tab === it.id ? `2px solid ${palette.accent}` : '2px solid transparent',
          letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
          marginBottom: -1,
        }}>
          {it.label} <span style={{ marginLeft: 6, fontWeight: 400, color: palette.dim }}>{it.count}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Sidebar nav ----------
function Sidebar({ screen, setScreen, palette, variant }) {
  const items = [
    { id: 'overview', label: 'Overview',     glyph: '◐' },
    { id: 'lookup',   label: 'Address',      glyph: '◇' },
    { id: 'region',   label: 'Region',       glyph: '◭' },
    { id: 'alerts',   label: 'Alerts',       glyph: '◈' },
    { id: 'sources',  label: 'Data sources', glyph: '◌' },
  ];
  return (
    <div style={{ width: 200, borderRight: `1px solid ${palette.border}`, background: palette.surface, padding: '16px 0', flexShrink: 0 }}>
      <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, background: palette.accent, borderRadius: 2 }}/>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AU · Outage</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: palette.fg }}>Tracker</div>
        </div>
      </div>
      {items.map(it => (
        <button key={it.id} onClick={() => setScreen(it.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '9px 16px', background: screen === it.id ? palette.rowSelected : 'transparent',
          border: 'none', borderLeft: screen === it.id ? `2px solid ${palette.accent}` : '2px solid transparent',
          color: screen === it.id ? palette.fg : palette.dim,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ fontSize: 14, opacity: 0.8 }}>{it.glyph}</span>
          <span>{it.label}</span>
        </button>
      ))}
      <div style={{ marginTop: 24, padding: '0 16px' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Status</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg, lineHeight: 1.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.dim }}>sources</span><span>9/10</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.dim }}>last sync</span><span>00:08</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.dim }}>uptime</span><span>99.94%</span></div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  SevBadge, OutageRow, Stat, FiltersBar, TabsHeader, Sidebar, applyFilters,
});
