// Outage Tracker — main screens

// ============== OVERVIEW ==============
function OverviewScreen({ palette, tab, setTab, filters, setFilters, openIncident, selected, pulse, weather, density, variant, selectedState, setSelectedState }) {
  const allRows = OUTAGES.filter(o => o.type === tab);
  const rows = applyFilters(allRows, filters);
  const liveCount = OUTAGES.filter(o => o.type === 'live').length;
  const customersAffected = OUTAGES.filter(o => o.type === 'live').reduce((a,b) => a + b.customers, 0);
  const avgEtr = Math.round(
    OUTAGES.filter(o => o.type === 'live').reduce((a,b) => a + (b.etr - Date.now()) / 60_000, 0) / liveCount
  );
  const plannedCount = OUTAGES.filter(o => o.type === 'planned').length;

  // Layout variants
  if (variant === 'editorial') {
    return <EditorialOverview palette={palette} rows={rows} pulse={pulse} weather={weather} density={density}
      tab={tab} setTab={setTab} filters={filters} setFilters={setFilters}
      openIncident={openIncident} selected={selected}
      selectedState={selectedState} setSelectedState={setSelectedState}
      stats={{ liveCount, customersAffected, avgEtr, plannedCount }} variant={variant}/>;
  }
  if (variant === 'cards') {
    return <CardsOverview palette={palette} rows={rows} pulse={pulse} weather={weather} density={density}
      tab={tab} setTab={setTab} filters={filters} setFilters={setFilters}
      openIncident={openIncident} selected={selected}
      selectedState={selectedState} setSelectedState={setSelectedState}
      stats={{ liveCount, customersAffected, avgEtr, plannedCount }} variant={variant}/>;
  }
  if (variant === 'mapfirst') {
    return <MapFirstOverview palette={palette} rows={rows} pulse={pulse} weather={weather} density={density}
      tab={tab} setTab={setTab} filters={filters} setFilters={setFilters}
      openIncident={openIncident} selected={selected}
      selectedState={selectedState} setSelectedState={setSelectedState}
      stats={{ liveCount, customersAffected, avgEtr, plannedCount }} variant={variant}/>;
  }
  // default: civic / ops both share the standard layout
  return <StandardOverview palette={palette} rows={rows} pulse={pulse} weather={weather} density={density}
    tab={tab} setTab={setTab} filters={filters} setFilters={setFilters}
    openIncident={openIncident} selected={selected}
    selectedState={selectedState} setSelectedState={setSelectedState}
    stats={{ liveCount, customersAffected, avgEtr, plannedCount }} variant={variant}/>;
}

function StandardOverview({ palette, rows, pulse, weather, density, tab, setTab, filters, setFilters, openIncident, selected, selectedState, setSelectedState, stats, variant }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* stats strip */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${palette.border}`, background: palette.bg }}>
        <Stat label="Active outages" value={stats.liveCount} sub="↑ 4 in last hour" palette={palette} accent={palette.high}/>
        <Stat label="Customers affected" value={fmtNum(stats.customersAffected)} sub="across 7 states" palette={palette}/>
        <Stat label="Median ETR" value={`${stats.avgEtr}m`} sub="from now" palette={palette}/>
        <Stat label="Planned (24h)" value={stats.plannedCount} sub="scheduled works" palette={palette} accent={palette.low}/>
      </div>

      {/* map + side */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ flex: 1, padding: 16, background: palette.bg }}>
          <AusMap palette={palette} pulse={pulse} showWeather={weather} density={density} variant={variant}
            selectedState={selectedState} onSelectState={setSelectedState}/>
        </div>
        <div style={{ width: 280, borderLeft: `1px solid ${palette.border}`, padding: '14px 16px', background: palette.surface }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By operator · live</div>
          <OperatorBars palette={palette}/>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>Top causes</div>
          <CauseBars palette={palette}/>
        </div>
      </div>

      <TabsHeader tab={tab} setTab={setTab} palette={palette}/>
      <FiltersBar filters={filters} setFilters={setFilters} palette={palette}/>
      <TableHeader palette={palette}/>
      <div style={{ flex: 1, overflow: 'auto', background: palette.bg }}>
        {rows.length === 0 ? <EmptyRow palette={palette}/> :
          rows.map(o => <OutageRow key={o.id} o={o} palette={palette} density={density} onOpen={openIncident} selected={selected?.id === o.id}/>)
        }
      </div>
    </div>
  );
}

function EditorialOverview({ palette, rows, pulse, weather, density, tab, setTab, filters, setFilters, openIncident, selected, selectedState, setSelectedState, stats, variant }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: palette.bg }}>
      <div style={{ padding: '32px 32px 24px', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{new Date().toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} · 14:08 AEDT</div>
        <h1 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 56, fontWeight: 600, lineHeight: 1.05, margin: '12px 0 8px', color: palette.fg, letterSpacing: '-0.02em', maxWidth: 800 }}>
          {stats.liveCount} active outages affecting {fmtNum(stats.customersAffected)} customers nationwide.
        </h1>
        <p style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16, color: palette.dim, maxWidth: 700, lineHeight: 1.5, margin: 0 }}>
          Severe thunderstorm activity along the east coast. Median restoration estimate {stats.avgEtr} minutes. {stats.plannedCount} planned works in the next 24 hours.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ padding: 24, borderRight: `1px solid ${palette.border}` }}>
          <AusMap palette={palette} pulse={pulse} showWeather={weather} density={density} variant={variant}
            selectedState={selectedState} onSelectState={setSelectedState}/>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: palette.border, marginBottom: 20 }}>
            <Stat label="Active" value={stats.liveCount} palette={palette} accent={palette.high}/>
            <Stat label="Affected" value={fmtNum(stats.customersAffected)} palette={palette}/>
            <Stat label="ETR" value={`${stats.avgEtr}m`} palette={palette}/>
            <Stat label="Planned" value={stats.plannedCount} palette={palette} accent={palette.low}/>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>By operator</div>
          <OperatorBars palette={palette}/>
        </div>
      </div>
      <TabsHeader tab={tab} setTab={setTab} palette={palette}/>
      <FiltersBar filters={filters} setFilters={setFilters} palette={palette}/>
      <TableHeader palette={palette}/>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rows.map(o => <OutageRow key={o.id} o={o} palette={palette} density={density} onOpen={openIncident} selected={selected?.id === o.id}/>)}
      </div>
    </div>
  );
}

function CardsOverview({ palette, rows, pulse, weather, density, tab, setTab, filters, setFilters, openIncident, selected, selectedState, setSelectedState, stats, variant }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: palette.bg }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${palette.border}` }}>
        <Stat label="Active" value={stats.liveCount} sub="↑ 4 / hour" palette={palette} accent={palette.high}/>
        <Stat label="Affected" value={fmtNum(stats.customersAffected)} sub="7 states" palette={palette}/>
        <Stat label="ETR median" value={`${stats.avgEtr}m`} palette={palette}/>
        <Stat label="Planned 24h" value={stats.plannedCount} palette={palette} accent={palette.low}/>
      </div>
      <div style={{ padding: 16, borderBottom: `1px solid ${palette.border}` }}>
        <AusMap palette={palette} pulse={pulse} showWeather={weather} density={density} variant={variant}
          height={340}
          selectedState={selectedState} onSelectState={setSelectedState}/>
      </div>
      <TabsHeader tab={tab} setTab={setTab} palette={palette}/>
      <FiltersBar filters={filters} setFilters={setFilters} palette={palette}/>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignContent: 'start' }}>
        {rows.map(o => <OutageCard key={o.id} o={o} palette={palette} onOpen={openIncident} selected={selected?.id === o.id}/>)}
      </div>
    </div>
  );
}

function MapFirstOverview({ palette, rows, pulse, weather, density, tab, setTab, filters, setFilters, openIncident, selected, selectedState, setSelectedState, stats, variant }) {
  return (
    <div style={{ display: 'flex', height: '100%', background: palette.bg }}>
      <div style={{ flex: 1, position: 'relative', borderRight: `1px solid ${palette.border}` }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <AusMap palette={palette} pulse={pulse} showWeather={weather} density={density} variant={variant}
            height="100%"
            selectedState={selectedState} onSelectState={setSelectedState}/>
        </div>
        <div style={{ position: 'absolute', top: 16, left: 16, background: palette.surface, border: `1px solid ${palette.border}`, padding: '12px 14px', minWidth: 260 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>National status</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 32, fontWeight: 600, color: palette.high, lineHeight: 1, marginTop: 6 }}>{stats.liveCount}</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginTop: 4 }}>active · {fmtNum(stats.customersAffected)} affected · ETR {stats.avgEtr}m</div>
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: palette.surface, border: `1px solid ${palette.border}`, padding: '10px 12px' }}>
          <Legend palette={palette}/>
        </div>
      </div>
      <div style={{ width: 460, display: 'flex', flexDirection: 'column' }}>
        <TabsHeader tab={tab} setTab={setTab} palette={palette}/>
        <FiltersBar filters={filters} setFilters={setFilters} palette={palette}/>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {rows.map(o => (
            <div key={o.id} onClick={() => openIncident(o)} style={{
              padding: '12px 14px', borderBottom: `1px solid ${palette.borderSoft}`, cursor: 'pointer',
              background: selected?.id === o.id ? palette.rowSelected : 'transparent',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{o.id} · {o.state}</span>
                <SevBadge status={o.status} palette={palette}/>
              </div>
              <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, fontWeight: 600, color: palette.fg, marginBottom: 2 }}>{o.suburb} · {o.postcode}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>
                {fmtNum(o.customers)} customers · {o.cause} · {OPERATORS.find(x => x.id === o.operator)?.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutageCard({ o, palette, onOpen, selected }) {
  const op = OPERATORS.find(x => x.id === o.operator);
  return (
    <div onClick={() => onOpen(o)} style={{
      border: `1px solid ${selected ? palette.accent : palette.border}`,
      background: palette.surface, padding: 14, cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim }}>{o.id}</span>
        <SevBadge status={o.status} palette={palette}/>
      </div>
      <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16, fontWeight: 600, color: palette.fg, marginBottom: 4 }}>{o.suburb}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: palette.dim, marginBottom: 10 }}>{o.state} {o.postcode} · {op?.name}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
        <div><span style={{ color: palette.dim }}>customers </span><span style={{ color: palette.fg, fontWeight: 600 }}>{fmtNum(o.customers)}</span></div>
        <div><span style={{ color: palette.dim }}>cause </span><span style={{ color: palette.fg }}>{o.cause}</span></div>
        <div><span style={{ color: palette.dim }}>started </span><span style={{ color: palette.fg }}>{fmtAgo(o.startedAt)} ago</span></div>
        <div><span style={{ color: palette.dim }}>etr </span><span style={{ color: palette.fg }}>{fmtTime(o.etr)}</span></div>
      </div>
    </div>
  );
}

function TableHeader({ palette }) {
  const cell = { fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' };
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 60px 1fr 140px 90px 130px 110px',
      gap: 12, padding: '8px 14px', borderBottom: `1px solid ${palette.border}`,
      background: palette.surfaceAlt,
    }}>
      <span style={cell}>ID</span>
      <span style={cell}>State</span>
      <span style={cell}>Suburb</span>
      <span style={cell}>Operator</span>
      <span style={cell}>Customers</span>
      <span style={cell}>Cause</span>
      <span style={cell}>Status</span>
    </div>
  );
}

function EmptyRow({ palette }) {
  return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: palette.dim }}>No outages match filter.</div>;
}

function Legend({ palette }) {
  const items = [
    { c: palette.ok, l: 'Nominal' },
    { c: palette.low, l: '1–2' },
    { c: palette.med, l: '3–5' },
    { c: palette.high, l: '6+' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: palette.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {items.map(it => (
        <div key={it.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, background: it.c, opacity: 0.65, border: `1px solid ${it.c}` }}/>
          <span>{it.l}</span>
        </div>
      ))}
    </div>
  );
}

function OperatorBars({ palette }) {
  const live = OUTAGES.filter(o => o.type === 'live');
  const counts = {};
  for (const o of live) counts[o.operator] = (counts[o.operator] || 0) + 1;
  const max = Math.max(...Object.values(counts), 1);
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 6);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sorted.map(([id, n]) => {
        const op = OPERATORS.find(x => x.id === id);
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
            <span style={{ flex: 1, color: palette.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op?.name}</span>
            <div style={{ width: 100, height: 8, background: palette.surfaceAlt, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${(n/max)*100}%`, background: palette.accent }}/>
            </div>
            <span style={{ color: palette.fg, width: 18, textAlign: 'right' }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

function CauseBars({ palette }) {
  const live = OUTAGES.filter(o => o.type === 'live');
  const counts = {};
  for (const o of live) counts[o.cause] = (counts[o.cause] || 0) + 1;
  const max = Math.max(...Object.values(counts), 1);
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sorted.map(([cause, n]) => (
        <div key={cause} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
          <span style={{ flex: 1, color: palette.fg }}>{cause}</span>
          <div style={{ width: 100, height: 8, background: palette.surfaceAlt, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${(n/max)*100}%`, background: palette.med }}/>
          </div>
          <span style={{ color: palette.fg, width: 18, textAlign: 'right' }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  OverviewScreen, StandardOverview, EditorialOverview, CardsOverview, MapFirstOverview,
  OutageCard, TableHeader, EmptyRow, Legend, OperatorBars, CauseBars,
});
