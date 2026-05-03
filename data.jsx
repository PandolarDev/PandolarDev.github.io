const OPERATORS = [
  { id: 'ausgrid',           name: 'Ausgrid',                    state: 'NSW', customers: 1740000 },
  { id: 'essential_energy',  name: 'Essential Energy',           state: 'NSW', customers:  895000 },
  { id: 'energex',           name: 'Energex',                    state: 'QLD', customers: 1400000 },
  { id: 'ergon',             name: 'Ergon Energy',               state: 'QLD', customers:  730000 },
  { id: 'powercor',          name: 'Powercor',                   state: 'VIC', customers:  780000 },
  { id: 'united_energy',     name: 'United Energy',              state: 'VIC', customers:  680000 },
  { id: 'jemena',            name: 'Jemena',                     state: 'VIC', customers:  340000 },
  { id: 'ausnet',            name: 'AusNet Services',            state: 'VIC', customers:  720000 },
  { id: 'western_power',     name: 'Western Power',              state: 'WA',  customers: 1100000 },
  { id: 'sa_power_networks', name: 'SA Power Networks',          state: 'SA',  customers:  890000 },
];

const CAUSES = ['Storm', 'Equipment fault', 'Vehicle impact', 'Vegetation', 'Planned works', 'Bushfire', 'Animal contact', 'Unknown'];

const STATUSES = ['Investigating', 'Crew dispatched', 'Crew on site', 'Power restored', 'Scheduled'];

const SUBURBS_BY_STATE = {
  NSW: ['Parramatta','Blacktown','Penrith','Bondi','Manly','Chatswood','Newtown','Liverpool','Hornsby','Wollongong','Newcastle','Gosford','Tamworth','Dubbo'],
  VIC: ['Carlton','Fitzroy','Richmond','St Kilda','Footscray','Preston','Frankston','Geelong','Ballarat','Bendigo','Shepparton','Werribee'],
  QLD: ['Fortitude Valley','New Farm','South Bank','Toowong','Chermside','Logan','Ipswich','Townsville','Cairns','Mackay','Rockhampton','Gold Coast'],
  WA:  ['Fremantle','Subiaco','Joondalup','Mandurah','Bunbury','Albany','Geraldton','Karratha','Kalgoorlie','Cottesloe'],
  SA:  ['Glenelg','Norwood','Prospect','Port Adelaide','Mount Gambier','Whyalla','Port Augusta','Murray Bridge'],
};

const STATES = [
  { code: 'NSW', name: 'New South Wales', tz: 'AEDT' },
  { code: 'VIC', name: 'Victoria',        tz: 'AEDT' },
  { code: 'QLD', name: 'Queensland',      tz: 'AEST' },
  { code: 'WA',  name: 'Western Australia', tz: 'AWST' },
  { code: 'SA',  name: 'South Australia', tz: 'ACDT' },
];

// Deterministic pseudo-random for stable mock data
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateOutages() {
  const r = seeded(42);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const now = Date.now();

  const rows = [];
  // Active outages — 38 of them
  for (let i = 0; i < 38; i++) {
    const op = pick(OPERATORS);
    const sub = pick(SUBURBS_BY_STATE[op.state]);
    const cause = pick(CAUSES.filter(c => c !== 'Planned works'));
    const status = pick(['Investigating','Crew dispatched','Crew on site']);
    const startedMin = Math.floor(r() * 720); // up to 12h ago
    const etrMin = Math.floor(r() * 480) + 30;
    const customers = Math.floor(r() * 4500) + 30;
    rows.push({
      id: `OUT-${String(2046100 + i).padStart(7,'0')}`,
      type: 'live',
      operator: op.id, state: op.state, suburb: sub,
      postcode: 2000 + Math.floor(r() * 7999),
      cause, status, customers,
      startedAt: now - startedMin * 60_000,
      etr: now + etrMin * 60_000,
      lat: -28 - r() * 10, lng: 130 + r() * 25,
      voltage: pick(['LV 415V','HV 11kV','HV 22kV','HV 33kV']),
      crews: Math.floor(r() * 4) + 1,
    });
  }
  // Planned — 14
  for (let i = 0; i < 14; i++) {
    const op = pick(OPERATORS);
    const sub = pick(SUBURBS_BY_STATE[op.state]);
    const startsInMin = Math.floor(r() * 7200) + 240;
    const dur = Math.floor(r() * 360) + 60;
    rows.push({
      id: `PLN-${String(880400 + i).padStart(7,'0')}`,
      type: 'planned',
      operator: op.id, state: op.state, suburb: sub,
      postcode: 2000 + Math.floor(r() * 7999),
      cause: 'Planned works', status: 'Scheduled',
      customers: Math.floor(r() * 1200) + 20,
      startedAt: now + startsInMin * 60_000,
      etr: now + (startsInMin + dur) * 60_000,
      lat: -28 - r() * 10, lng: 130 + r() * 25,
      voltage: 'HV 11kV', crews: 1,
      worktype: pick(['Pole replacement','Transformer upgrade','Line maintenance','Vegetation clearing','Asset inspection']),
    });
  }
  // History — 60 resolved over last 30 days
  for (let i = 0; i < 60; i++) {
    const op = pick(OPERATORS);
    const sub = pick(SUBURBS_BY_STATE[op.state]);
    const cause = pick(CAUSES);
    const endedAgo = Math.floor(r() * 30 * 24 * 60);
    const dur = Math.floor(r() * 480) + 20;
    rows.push({
      id: `HIS-${String(7720000 + i).padStart(7,'0')}`,
      type: 'history',
      operator: op.id, state: op.state, suburb: sub,
      postcode: 2000 + Math.floor(r() * 7999),
      cause, status: 'Power restored',
      customers: Math.floor(r() * 6000) + 15,
      startedAt: now - (endedAgo + dur) * 60_000,
      etr: now - endedAgo * 60_000,
      durationMin: dur,
      lat: -28 - r() * 10, lng: 130 + r() * 25,
      voltage: 'HV 11kV', crews: 0,
    });
  }
  return rows;
}

let OUTAGES = generateOutages();

// Placeholder sources shown before the API responds
const DEFAULT_SOURCES = OPERATORS.map(p => ({
  id: p.id, name: p.name, type: 'API', status: 'pending', lastSync: null, records: 0,
}));

function normaliseApiOutage(row) {
  const typeMap = { unplanned: 'live', planned: 'planned', restored: 'history' };
  const startTs = row.startedAt ? new Date(row.startedAt).getTime() : Date.now();
  const etrTs   = row.estimatedRestoration ? new Date(row.estimatedRestoration).getTime() : Date.now() + 3600_000;
  return {
    id:        row.id,
    type:      typeMap[row.type] || 'live',
    operator:  row.provider,
    state:     row.state  || '',
    suburb:    row.suburb || '',
    postcode:  row.postcode || '',
    lat:       row.lat,
    lng:       row.lng,
    cause:     row.cause  || 'Unknown',
    status:    row.status || 'Investigating',
    customers: row.customersAffected || 0,
    startedAt: startTs,
    etr:       etrTs,
    voltage:   'HV 11kV',
    crews:     0,
  };
}

// Fetches live data from the backend API (set window.API_URL to enable).
// Falls back to mock data when API_URL is empty or the request fails.
function useOutageData() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [, forceRender] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    const apiUrl = (window.API_URL || '').replace(/\/$/, '');
    if (!apiUrl) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${apiUrl}/api/outages?type=unplanned&limit=500`),
          fetch(`${apiUrl}/api/outages?type=planned&limit=200`),
          fetch(`${apiUrl}/api/outages?type=restored&limit=200`),
        ]);
        if (!r1.ok || !r2.ok || !r3.ok) throw new Error('API request failed');
        const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);

        OUTAGES = [
          ...(d1.data || []).map(normaliseApiOutage),
          ...(d2.data || []).map(normaliseApiOutage),
          ...(d3.data || []).map(normaliseApiOutage),
        ];
        window.OUTAGES = OUTAGES;

        setLastUpdated(new Date());
        forceRender();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
    const timerId = setInterval(load, 5 * 60_000);
    return () => clearInterval(timerId);
  }, []);

  return { loading, error, lastUpdated };
}

// Returns [sources, setSources] — populated from /api/providers when available,
// falls back to DEFAULT_SOURCES (real provider names, status: pending).
function useLiveSources() {
  const [sources, setSources] = React.useState(DEFAULT_SOURCES);

  React.useEffect(() => {
    const apiUrl = (window.API_URL || '').replace(/\/$/, '');
    if (!apiUrl) return;

    function load() {
      const now = Date.now();
      fetch(`${apiUrl}/api/providers`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(({ data }) => {
          if (!Array.isArray(data) || !data.length) return;
          setSources(data.map(p => ({
            id:       p.provider,
            name:     p.providerName,
            type:     'API',
            status:   p.lastError ? 'degraded' : (p.lastSuccessAt ? 'live' : 'pending'),
            lastSync: p.lastFetchAt ? Math.floor((now - new Date(p.lastFetchAt).getTime()) / 1000) : null,
            records:  p.outageCount || 0,
            lastError: p.lastError || null,
          })));
        })
        .catch(() => {});
    }

    load();
    const timerId = setInterval(load, 60_000);
    return () => clearInterval(timerId);
  }, []);

  return [sources, setSources];
}

Object.assign(window, { OPERATORS, CAUSES, STATUSES, STATES, SUBURBS_BY_STATE, OUTAGES, DEFAULT_SOURCES, useOutageData, useLiveSources });
