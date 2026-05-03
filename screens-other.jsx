// Other screens — region detail, lookup, alerts, sources, incident detail panel

// ============== REGION ==============
function RegionScreen({ palette, selectedState, setSelectedState, openIncident, density, pulse, variant }) {
  const code = selectedState || 'NSW';
  const isMobile = useMobile();
  const stateInfo = STATES.find(s => s.code === code);
  const stateOutages = OUTAGES.filter(o => o.state === code && isCurrentlyActive(o));
  const customers = stateOutages.reduce((a,b) => a + b.customers, 0);
  const opsAffected = new Set(stateOutages.map(o => o.operator));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: palette.bg }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Region</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
          <h2 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 32, fontWeight: 600, color: palette.fg, margin: 0, letterSpacing: '-0.01em' }}>{stateInfo.name}</h2>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim }}>{stateInfo.code} · {stateInfo.tz}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {STATES.map(s => (
            <button key={s.code} onClick={() => setSelectedState(s.code)} style={{
              padding: '5px 11px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              background: code === s.code ? palette.fg : 'transparent',
              color: code === s.code ? palette.bg : palette.dim,
              border: `1px solid ${code === s.code ? palette.fg : palette.border}`,
              cursor: 'pointer', borderRadius: 0,
            }}>{s.code}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 0, borderBottom: `1px solid ${palette.border}` }}>
        <Stat label="Active" value={stateOutages.length} palette={palette} accent={palette.high}/>
        <Stat label="Customers" value={fmtNum(customers)} palette={palette}/>
        <Stat label="Operators" value={`${opsAffected.size}/${OPERATORS.filter(o => o.state === code).length}`} palette={palette}/>
        <Stat label="Uptime 30d" value="99.86%" palette={palette} accent={palette.ok}/>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', overflow: 'hidden' }}>
        <div style={{ padding: 16, borderRight: `1px solid ${palette.border}`, overflow: 'auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active outages</div>
          {stateOutages.length === 0
            ? <div style={{ padding: 24, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim }}>No active outages in {code}.</div>
            : stateOutages.map(o => (
              <div key={o.id} onClick={() => openIncident(o)} style={{
                padding: '10px 0', borderBottom: `1px solid ${palette.borderSoft}`, cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 4,
              }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, fontWeight: 600, color: palette.fg }}>{o.suburb} <span style={{ color: palette.dim, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{o.postcode}</span></div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginTop: 3 }}>
                    {o.id} · {OPERATORS.find(x => x.id === o.operator)?.name} · {o.cause} · {fmtNum(o.customers)} customers
                  </div>
                </div>
                <SevBadge status={o.status} palette={palette}/>
              </div>
            ))}
        </div>
        <div style={{ padding: 16, overflow: 'auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>30-day outage history</div>
          <Sparkline palette={palette} state={code}/>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Operators in {code}</div>
          {OPERATORS.filter(o => o.state === code).map(op => (
            <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${palette.borderSoft}`, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
              <span style={{ color: palette.fg }}>{op.name}</span>
              <span style={{ color: palette.dim }}>{fmtNum(op.customers)} customers</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ palette, state }) {
  const days = 30;
  const data = React.useMemo(() => {
    const arr = [];
    let s = state.charCodeAt(0) * 7;
    for (let i = 0; i < days; i++) {
      s = (s * 9301 + 49297) % 233280;
      arr.push(Math.floor((s / 233280) * 14) + 1);
    }
    return arr;
  }, [state]);
  const max = Math.max(...data);
  return (
    <svg viewBox={`0 0 ${days * 14} 100`} style={{ width: '100%', height: 100, display: 'block' }}>
      {data.map((v, i) => (
        <rect key={i} x={i * 14 + 2} y={100 - (v / max) * 90} width={10} height={(v / max) * 90} fill={palette.accent} opacity={i === days - 1 ? 1 : 0.6}/>
      ))}
      <text x="0" y="98" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={palette.dim}>30d ago</text>
      <text x={days * 14} y="98" textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={palette.dim}>today</text>
    </svg>
  );
}

// ============== ADDRESS LOOKUP ==============
function LookupScreen({ palette, openIncident }) {
  const [query, setQuery] = React.useState('');
  const [submitted, setSubmitted] = React.useState(null);

  const submit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    // crude match: check postcode or suburb in query
    const q = query.toLowerCase();
    const match = OUTAGES.find(o => isCurrentlyActive(o) && (q.includes(String(o.postcode)) || q.includes(o.suburb.toLowerCase())));
    setSubmitted({ query, match });
  };

  const sample = ['12 Bondi Rd, Bondi NSW 2026', '88 Brunswick St, Fitzroy VIC 3065', 'Toowong QLD 4066'];

  return (
    <div style={{ padding: 32, maxWidth: 760, margin: '0 auto', height: '100%', overflow: 'auto', background: palette.bg }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Address lookup</div>
      <h2 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 28, fontWeight: 600, color: palette.fg, margin: '6px 0 18px', letterSpacing: '-0.01em' }}>Check power status at an address.</h2>
      <form onSubmit={submit} style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Street, suburb, or postcode"
          style={{
            flex: 1, padding: '14px 16px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16,
            border: `1px solid ${palette.border}`, background: palette.surface, color: palette.fg, borderRadius: 0,
          }}/>
        <button type="submit" style={{
          padding: '0 24px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
          background: palette.fg, color: palette.bg, border: `1px solid ${palette.fg}`,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
        }}>Check</button>
      </form>
      <div style={{ display: 'flex', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, flexWrap: 'wrap' }}>
        <span>try:</span>
        {sample.map(s => (
          <button key={s} onClick={() => { setQuery(s); }} style={{
            background: 'none', border: 'none', color: palette.accent, textDecoration: 'underline', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 'inherit', padding: 0,
          }}>{s}</button>
        ))}
      </div>

      {submitted && (
        <div style={{ marginTop: 28, border: `1px solid ${palette.border}`, background: palette.surface }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${palette.borderSoft}` }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>Result for</div>
            <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16, color: palette.fg, fontWeight: 600 }}>{submitted.query}</div>
          </div>
          {submitted.match ? (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 12, height: 12, background: palette.high, borderRadius: '50%' }}/>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 18, fontWeight: 600, color: palette.fg }}>Power is out at this address.</span>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim, lineHeight: 1.7 }}>
                <div>Outage: <span style={{ color: palette.fg }}>{submitted.match.id}</span></div>
                <div>Operator: <span style={{ color: palette.fg }}>{OPERATORS.find(x => x.id === submitted.match.operator)?.name}</span></div>
                <div>Cause: <span style={{ color: palette.fg }}>{submitted.match.cause}</span></div>
                <div>Started: <span style={{ color: palette.fg }}>{fmtAgo(submitted.match.startedAt)} ago</span></div>
                <div>Estimated restoration: <span style={{ color: palette.fg }}>{fmtTime(submitted.match.etr)}</span></div>
                <div>Customers affected: <span style={{ color: palette.fg }}>{fmtNum(submitted.match.customers)}</span></div>
              </div>
              <button onClick={() => openIncident(submitted.match)} style={{
                marginTop: 14, padding: '8px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                background: 'transparent', color: palette.accent, border: `1px solid ${palette.accent}`,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
              }}>Open incident →</button>
            </div>
          ) : (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, background: palette.ok, borderRadius: '50%' }}/>
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 18, fontWeight: 600, color: palette.fg }}>No outages reported.</span>
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim }}>If your power is out, report it via your network operator. Last data sync 00:08 ago.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== ALERTS ==============
function AlertsScreen({ palette }) {
  const isMobile = useMobile();
  const [form, setForm] = React.useState({
    address: '', email: '', sms: '', threshold: 'any',
    channels: { email: true, sms: false, push: false },
    types: { live: true, planned: true, restored: false },
  });
  const [saved, setSaved] = React.useState(false);
  const [subs, setSubs] = React.useState([]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.address) return;
    const channels = Object.entries(form.channels).filter(([_,v]) => v).map(([k]) => k).join(', ');
    const types = Object.entries(form.types).filter(([_,v]) => v).map(([k]) => k).join(', ');
    setSubs([...subs, { id: 'sub' + Date.now(), address: form.address, channels, types }]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setForm({ ...form, address: '' });
  };

  const fieldStyle = {
    width: '100%', padding: '10px 12px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14,
    border: `1px solid ${palette.border}`, background: palette.surface, color: palette.fg, borderRadius: 0,
  };
  const labelStyle = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };

  return (
    <div style={{ padding: isMobile ? 16 : 32, height: '100%', overflow: 'auto', background: palette.bg }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alerts</div>
        <h2 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: isMobile ? 22 : 28, fontWeight: 600, color: palette.fg, margin: '6px 0 24px', letterSpacing: '-0.01em' }}>Subscribe to outage notifications.</h2>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: 24 }}>
          <form onSubmit={submit} style={{ border: `1px solid ${palette.border}`, padding: 20, background: palette.surface }}>
            <label style={labelStyle}>Watch address</label>
            <input style={fieldStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street or postcode"/>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={fieldStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/>
              </div>
              <div>
                <label style={labelStyle}>Mobile (SMS)</label>
                <input style={fieldStyle} value={form.sms} onChange={e => setForm({ ...form, sms: e.target.value })} placeholder="04xx xxx xxx"/>
              </div>
            </div>

            <label style={{ ...labelStyle, marginTop: 16 }}>Channels</label>
            <div style={{ display: 'flex', gap: 14, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.fg }}>
              {['email','sms','push'].map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.channels[c]} onChange={e => setForm({ ...form, channels: { ...form.channels, [c]: e.target.checked } })}/>
                  {c}
                </label>
              ))}
            </div>

            <label style={{ ...labelStyle, marginTop: 16 }}>Notify me about</label>
            <div style={{ display: 'flex', gap: 14, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.fg }}>
              {['live','planned','restored'].map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.types[c]} onChange={e => setForm({ ...form, types: { ...form.types, [c]: e.target.checked } })}/>
                  {c}
                </label>
              ))}
            </div>

            <label style={{ ...labelStyle, marginTop: 16 }}>Threshold</label>
            <select style={fieldStyle} value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })}>
              <option value="any">Any outage at address</option>
              <option value="500">If 500+ customers affected</option>
              <option value="1000">If 1,000+ customers affected</option>
              <option value="state">Any outage in my state</option>
            </select>

            <button type="submit" style={{
              marginTop: 18, padding: '12px 18px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
              background: palette.fg, color: palette.bg, border: `1px solid ${palette.fg}`,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
            }}>{saved ? '✓ Saved' : 'Subscribe'}</button>
          </form>

          <div>
            <div style={labelStyle}>Active subscriptions ({subs.length})</div>
            <div style={{ border: `1px solid ${palette.border}`, background: palette.surface }}>
              {subs.map(s => (
                <div key={s.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${palette.borderSoft}` }}>
                  <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: palette.fg, fontWeight: 600 }}>{s.address}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginTop: 3 }}>via {s.channels} · {s.types}</div>
                  <button onClick={() => setSubs(subs.filter(x => x.id !== s.id))} style={{
                    marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim,
                    textTransform: 'uppercase', letterSpacing: '0.08em', padding: 0,
                  }}>remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== DATA SOURCES ==============
function SourcesScreen({ palette }) {
  const isMobile = useMobile();
  const [sources, setSources] = useLiveSources();
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', type: 'API', url: '' });

  const add = (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSources([...sources, {
      id: 'src-' + Date.now(),
      name: form.name, type: form.type,
      status: 'live', lastSync: 0, records: 0,
    }]);
    setForm({ name: '', type: 'API', url: '' });
    setAdding(false);
  };

  const remove = (id) => setSources(sources.filter(s => s.id !== id));
  const togglePause = (id) => setSources(sources.map(s => s.id === id ? { ...s, status: s.status === 'paused' ? 'live' : 'paused' } : s));

  const fieldStyle = {
    flex: 1, padding: '8px 10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
    border: `1px solid ${palette.border}`, background: palette.bg, color: palette.fg, borderRadius: 0,
  };

  return (
    <div style={{ padding: isMobile ? 14 : 32, height: '100%', overflow: 'auto', background: palette.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Data sources</div>
          <h2 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 28, fontWeight: 600, color: palette.fg, margin: '6px 0 0', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{sources.length} feeds ingesting</h2>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim, marginTop: 6 }}>
            {sources.filter(s => s.status === 'live').length} live · {sources.filter(s => s.status === 'degraded').length} degraded · {sources.filter(s => s.status === 'paused').length} paused
          </div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{
          padding: '10px 16px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
          background: adding ? 'transparent' : palette.fg, color: adding ? palette.fg : palette.bg,
          border: `1px solid ${palette.fg}`, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>{adding ? 'Cancel' : '+ Add source'}</button>
      </div>

      {adding && (
        <form onSubmit={add} style={{ border: `1px solid ${palette.accent}`, padding: 14, marginBottom: 16, background: palette.surface, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={fieldStyle} placeholder="Source name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
          <select style={fieldStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {['API','GeoJSON','JSON','CSV','Webhook','RSS','WMS','Scrape'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input style={{ ...fieldStyle, flex: 2 }} placeholder="https://endpoint…" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}/>
          <button type="submit" style={{
            padding: '8px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
            background: palette.accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 0,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Connect</button>
        </form>
      )}

      <div style={{ border: `1px solid ${palette.border}`, background: palette.surface }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 110px 110px 130px', gap: 0, padding: '10px 14px', borderBottom: `1px solid ${palette.border}`, background: palette.surfaceAlt }}>
            {['Source','Type','Status','Last sync','Records','Actions'].map(h => (
              <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
        )}
        {sources.map(s => {
          const statusColor = { live: palette.ok, degraded: palette.med, paused: palette.dim }[s.status];
          if (isMobile) {
            return (
              <div key={s.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${palette.borderSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: palette.fg, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }}/>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginBottom: 8 }}>
                  {s.type} · {s.lastSync != null ? `synced ${s.lastSync}s ago` : 'pending'} · {fmtNum(s.records)} records
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => togglePause(s.id)} style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '5px 10px',
                    background: 'transparent', border: `1px solid ${palette.border}`, color: palette.dim,
                    textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 0,
                  }}>{s.status === 'paused' ? 'resume' : 'pause'}</button>
                  <button onClick={() => remove(s.id)} style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '5px 10px',
                    background: 'transparent', border: `1px solid ${palette.high}`, color: palette.high,
                    textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 0,
                  }}>delete</button>
                </div>
              </div>
            );
          }
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 110px 110px 130px', gap: 0, padding: '12px 14px', borderBottom: `1px solid ${palette.borderSoft}`, alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: palette.fg, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, marginTop: 2 }}>{s.id}</div>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg }}>{s.type}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }}/>
                {s.status}
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{s.lastSync != null ? `${s.lastSync}s ago` : '—'}</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg }}>{fmtNum(s.records)}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => togglePause(s.id)} style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '4px 8px',
                  background: 'transparent', border: `1px solid ${palette.border}`, color: palette.dim,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 0,
                }}>{s.status === 'paused' ? 'resume' : 'pause'}</button>
                <button onClick={() => remove(s.id)} style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, padding: '4px 8px',
                  background: 'transparent', border: `1px solid ${palette.high}`, color: palette.high,
                  textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 0,
                }}>delete</button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============== INCIDENT DETAIL (slide-over panel) ==============
function IncidentPanel({ outage, onClose, palette }) {
  if (!outage) return null;
  const isMobile = useMobile();
  const op = OPERATORS.find(x => x.id === outage.operator);

  const events = [
    { t: outage.startedAt, label: 'Outage detected', desc: `${outage.cause} reported in ${outage.suburb}` },
    { t: outage.startedAt + 5 * 60_000, label: 'Operator notified', desc: op?.name },
    { t: outage.startedAt + 12 * 60_000, label: 'Crew dispatched', desc: `${outage.crews} crew(s) en route` },
    { t: outage.startedAt + 28 * 60_000, label: 'Investigating', desc: 'Fault location confirmed' },
    { t: outage.etr, label: outage.etr > Date.now() ? 'Estimated restoration' : 'ETR exceeded — restoration ongoing', desc: 'Subject to conditions', future: outage.etr > Date.now() },
  ];

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: isMobile ? '100%' : 460,
      background: palette.surface, borderLeft: `1px solid ${palette.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 1100,
      boxShadow: `-12px 0 32px ${palette.shadow}`,
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${palette.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{outage.id}</span>
            <SevBadge status={outage.status} palette={palette}/>
          </div>
          <h3 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 22, fontWeight: 600, color: palette.fg, margin: '6px 0 2px', letterSpacing: '-0.01em' }}>{outage.suburb}, {outage.state} {outage.postcode}</h3>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim }}>{op?.name}</div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: palette.dim,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, padding: 4,
        }}>✕</button>
      </div>

      <div style={{ overflow: 'auto', flex: 1, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: palette.border, marginBottom: 18 }}>
          <DetailCell label="Customers" value={fmtNum(outage.customers)} palette={palette}/>
          <DetailCell label="Cause" value={outage.cause} palette={palette}/>
          <DetailCell label="Started" value={fmtAgo(outage.startedAt) + ' ago'} palette={palette}/>
          <DetailCell label="ETR" value={outage.etr > Date.now() ? fmtTime(outage.etr) : fmtDateTime(outage.etr) + ' (overdue)'} palette={palette}/>
          <DetailCell label="Voltage" value={outage.voltage} palette={palette}/>
          <DetailCell label="Crews" value={outage.crews} palette={palette}/>
        </div>

        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Timeline</div>
        <div style={{ paddingLeft: 14, borderLeft: `1px solid ${palette.borderSoft}` }}>
          {events.map((ev, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
              <div style={{
                position: 'absolute', left: -19, top: 4, width: 9, height: 9,
                background: ev.future ? palette.bg : palette.accent,
                border: `2px solid ${palette.accent}`, borderRadius: '50%',
              }}/>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{fmtDateTime(ev.t)}</div>
              <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, fontWeight: 600, color: palette.fg, marginTop: 1 }}>{ev.label}</div>
              <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: palette.dim, marginTop: 1 }}>{ev.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: 14, background: palette.surfaceAlt, border: `1px solid ${palette.borderSoft}` }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Affected feeders</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.fg, lineHeight: 1.7 }}>
            FDR-{outage.postcode}-A · FDR-{outage.postcode}-B<br/>
            ZSS: {outage.suburb.toUpperCase().slice(0,4)}-ZS · TX: {1000 + (outage.postcode % 900)}
          </div>
        </div>
      </div>

      <div style={{ padding: 14, borderTop: `1px solid ${palette.border}`, display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
          background: palette.fg, color: palette.bg, border: `1px solid ${palette.fg}`,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
        }}>Subscribe to updates</button>
        <button style={{
          padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          background: 'transparent', color: palette.fg, border: `1px solid ${palette.border}`,
          letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 0,
        }}>Share</button>
      </div>
    </div>
  );
}

function DetailCell({ label, value, palette }) {
  return (
    <div style={{ background: palette.surface, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: palette.fg, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

Object.assign(window, {
  RegionScreen, LookupScreen, AlertsScreen, SourcesScreen, IncidentPanel, DetailCell, Sparkline,
});
