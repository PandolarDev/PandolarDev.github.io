// Mock data for the Outage Tracker. Original fictional operator names.

const OPERATORS = [
  { id: 'gridlink-nsw',  name: 'GridLink NSW',         state: 'NSW', customers: 1820000 },
  { id: 'eastern-net',   name: 'Eastern Networks',     state: 'NSW', customers: 980000 },
  { id: 'southern-pwr',  name: 'Southern Power Co.',   state: 'VIC', customers: 1640000 },
  { id: 'metrowatt',     name: 'MetroWatt Distribution', state: 'VIC', customers: 740000 },
  { id: 'sunstate-nrg',  name: 'SunState Energy',      state: 'QLD', customers: 1410000 },
  { id: 'tropline',      name: 'TropLine Networks',    state: 'QLD', customers: 230000 },
  { id: 'westgrid',      name: 'WestGrid Utility',     state: 'WA',  customers: 1110000 },
  { id: 'redearth',      name: 'RedEarth Power',       state: 'SA',  customers: 880000 },
  { id: 'tasline',       name: 'TasLine Energy',       state: 'TAS', customers: 290000 },
  { id: 'topend',        name: 'TopEnd Grid',          state: 'NT',  customers: 95000 },
];

const CAUSES = ['Storm', 'Equipment fault', 'Vehicle impact', 'Vegetation', 'Planned works', 'Bushfire', 'Animal contact', 'Unknown'];

const STATUSES = ['Investigating', 'Crew dispatched', 'Crew on site', 'Power restored', 'Scheduled'];

const SUBURBS_BY_STATE = {
  NSW: ['Parramatta','Blacktown','Penrith','Bondi','Manly','Chatswood','Newtown','Liverpool','Hornsby','Wollongong','Newcastle','Gosford','Tamworth','Dubbo'],
  VIC: ['Carlton','Fitzroy','Richmond','St Kilda','Footscray','Preston','Frankston','Geelong','Ballarat','Bendigo','Shepparton','Werribee'],
  QLD: ['Fortitude Valley','New Farm','South Bank','Toowong','Chermside','Logan','Ipswich','Townsville','Cairns','Mackay','Rockhampton','Gold Coast'],
  WA:  ['Fremantle','Subiaco','Joondalup','Mandurah','Bunbury','Albany','Geraldton','Karratha','Kalgoorlie','Cottesloe'],
  SA:  ['Glenelg','Norwood','Prospect','Port Adelaide','Mount Gambier','Whyalla','Port Augusta','Murray Bridge'],
  TAS: ['Hobart','Launceston','Devonport','Burnie','Glenorchy','Kingston'],
  NT:  ['Darwin','Palmerston','Alice Springs','Katherine','Tennant Creek'],
};

const STATES = [
  { code: 'NSW', name: 'New South Wales', tz: 'AEDT' },
  { code: 'VIC', name: 'Victoria',        tz: 'AEDT' },
  { code: 'QLD', name: 'Queensland',      tz: 'AEST' },
  { code: 'WA',  name: 'Western Australia', tz: 'AWST' },
  { code: 'SA',  name: 'South Australia', tz: 'ACDT' },
  { code: 'TAS', name: 'Tasmania',        tz: 'AEDT' },
  { code: 'NT',  name: 'Northern Territory', tz: 'ACST' },
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

// Default data sources (user can add/remove via sources screen)
const DEFAULT_SOURCES = [
  { id: 'src-aemo',     name: 'AEMO market notices',    type: 'API',     status: 'live',    lastSync: 38,  records: 14_290 },
  { id: 'src-gridlink', name: 'GridLink NSW feed',      type: 'GeoJSON', status: 'live',    lastSync: 12,  records: 4_180 },
  { id: 'src-eastnet',  name: 'Eastern Networks API',   type: 'JSON',    status: 'live',    lastSync: 47,  records: 2_640 },
  { id: 'src-southpwr', name: 'Southern Power CSV',     type: 'CSV',     status: 'live',    lastSync: 124, records: 6_910 },
  { id: 'src-metrowat', name: 'MetroWatt webhook',      type: 'Webhook', status: 'live',    lastSync: 8,   records: 1_220 },
  { id: 'src-sunstate', name: 'SunState Energy feed',   type: 'GeoJSON', status: 'live',    lastSync: 19,  records: 5_090 },
  { id: 'src-westgrid', name: 'WestGrid utility API',   type: 'API',     status: 'degraded',lastSync: 612, records: 3_810 },
  { id: 'src-tasline',  name: 'TasLine RSS',            type: 'RSS',     status: 'live',    lastSync: 91,  records: 410 },
  { id: 'src-bom',      name: 'BoM weather overlay',    type: 'WMS',     status: 'live',    lastSync: 22,  records: 0 },
  { id: 'src-redearth', name: 'RedEarth status page',   type: 'Scrape',  status: 'paused',  lastSync: 3600,records: 1_140 },
];

// Real provider registry — maps backend scraper IDs to display info
const REAL_PROVIDERS = [
  { id: 'energex',       name: 'Energex',       state: 'QLD', customers: 1400000 },
  { id: 'western_power', name: 'Western Power',  state: 'WA',  customers: 1100000 },
  { id: 'jemena',        name: 'Jemena',         state: 'VIC', customers:  340000 },
  { id: 'united_energy', name: 'United Energy',  state: 'VIC', customers:  680000 },
  { id: 'powercor',      name: 'Powercor',       state: 'VIC', customers:  780000 },
];

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

        // Merge real provider metadata into the OPERATORS registry
        for (const rp of REAL_PROVIDERS) {
          if (!OPERATORS.find(o => o.id === rp.id)) OPERATORS.push(rp);
        }

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

Object.assign(window, { OPERATORS, CAUSES, STATUSES, STATES, SUBURBS_BY_STATE, OUTAGES, DEFAULT_SOURCES, useOutageData });
