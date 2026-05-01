// Stylized Australia map — abstracted polygons by state, NOT a real geographic dataset.
// Built for visual identification, not navigation accuracy.

const STATE_PATHS = {
  // Approximate, schematic polygons in a 1000x720 viewbox.
  WA:  'M 60 140 L 320 140 L 350 200 L 350 360 L 380 460 L 360 540 L 200 560 L 80 520 L 60 360 Z',
  NT:  'M 320 140 L 520 140 L 540 360 L 380 360 L 350 360 L 350 200 Z',
  SA:  'M 350 360 L 540 360 L 600 460 L 600 560 L 520 580 L 380 560 L 380 460 Z',
  QLD: 'M 520 140 L 820 120 L 870 280 L 820 360 L 700 380 L 600 460 L 540 360 Z',
  NSW: 'M 600 460 L 700 380 L 820 360 L 870 420 L 820 500 L 700 520 L 600 540 L 600 480 Z',
  VIC: 'M 600 540 L 700 520 L 820 500 L 800 580 L 700 600 L 600 580 L 600 560 Z',
  TAS: 'M 720 640 L 800 640 L 800 700 L 720 700 Z',
};

// Centroids for label placement
const STATE_CENTROIDS = {
  WA:  { x: 200, y: 340 },
  NT:  { x: 420, y: 240 },
  SA:  { x: 470, y: 470 },
  QLD: { x: 700, y: 240 },
  NSW: { x: 730, y: 440 },
  VIC: { x: 700, y: 560 },
  TAS: { x: 760, y: 670 },
};

// City pin coords in same viewbox
const CITY_PINS = {
  Sydney:    { x: 850, y: 460, state: 'NSW' },
  Melbourne: { x: 720, y: 580, state: 'VIC' },
  Brisbane:  { x: 850, y: 360, state: 'QLD' },
  Perth:     { x: 80,  y: 470, state: 'WA' },
  Adelaide:  { x: 560, y: 540, state: 'SA' },
  Hobart:    { x: 760, y: 690, state: 'TAS' },
  Darwin:    { x: 410, y: 150, state: 'NT' },
  Canberra:  { x: 790, y: 490, state: 'NSW' },
};

// Aggregate outage counts by state from window.OUTAGES
function aggregateByState(outages, type = 'live') {
  const m = {};
  for (const s of Object.keys(STATE_PATHS)) m[s] = { count: 0, customers: 0 };
  for (const o of outages) {
    if (o.type !== type) continue;
    if (!m[o.state]) continue;
    m[o.state].count += 1;
    m[o.state].customers += o.customers;
  }
  return m;
}

function severityFor(count, palette) {
  if (count === 0) return palette.ok;
  if (count <= 2) return palette.low;
  if (count <= 5) return palette.med;
  return palette.high;
}

function AusMap({
  outages = window.OUTAGES,
  selectedState = null,
  onSelectState = () => {},
  palette,
  pulse = true,
  showWeather = false,
  showPins = true,
  height = 460,
  density = 'comfortable',
  variant = 'civic',
}) {
  const stats = aggregateByState(outages, 'live');
  const isDark = palette.bg.startsWith('#0') || palette.bg.startsWith('#1');

  // jittered outage points for visual texture
  const pts = React.useMemo(() => {
    return outages
      .filter(o => o.type === 'live')
      .map((o, i) => {
        const c = STATE_CENTROIDS[o.state] || { x: 500, y: 400 };
        const a = (i * 137.5) % 360 * Math.PI / 180;
        const r = 30 + (i * 13) % 60;
        return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, state: o.state, customers: o.customers, id: o.id };
      });
  }, [outages]);

  return (
    <svg viewBox="0 0 1000 720" style={{ width: '100%', height, display: 'block' }} aria-label="Australia outage map">
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={palette.gridLine} strokeWidth="1"/>
        </pattern>
        <radialGradient id="weather-cyclone" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.high} stopOpacity="0.5"/>
          <stop offset="100%" stopColor={palette.high} stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="weather-storm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.med} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={palette.med} stopOpacity="0"/>
        </radialGradient>
        <filter id="soft-glow">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>

      {/* Lat/long grid for ops feel */}
      <g stroke={palette.gridLine} strokeWidth="0.5" opacity="0.4">
        {[120, 220, 320, 420, 520, 620].map(y =>
          <line key={`h${y}`} x1="40" y1={y} x2="900" y2={y} strokeDasharray="2 4"/>
        )}
        {[100, 250, 400, 550, 700, 850].map(x =>
          <line key={`v${x}`} x1={x} y1="100" x2={x} y2="710" strokeDasharray="2 4"/>
        )}
      </g>

      {/* Weather overlay */}
      {showWeather && (
        <g>
          <circle cx="780" cy="280" r="100" fill="url(#weather-cyclone)"/>
          <circle cx="700" cy="500" r="80" fill="url(#weather-storm)"/>
          <circle cx="200" cy="200" r="60" fill="url(#weather-storm)"/>
          <text x="780" y="200" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={palette.dim} textAnchor="middle">CYC LANI · CAT 2</text>
          <text x="700" y="430" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={palette.dim} textAnchor="middle">SEVERE T-STORM</text>
        </g>
      )}

      {/* State polygons */}
      {Object.entries(STATE_PATHS).map(([code, d]) => {
        const count = stats[code].count;
        const fill = severityFor(count, palette);
        const isSel = selectedState === code;
        return (
          <g key={code} style={{ cursor: 'pointer' }} onClick={() => onSelectState(code)}>
            <path
              d={d}
              fill={fill}
              fillOpacity={isSel ? 0.9 : 0.65}
              stroke={isSel ? palette.fg : palette.stateStroke}
              strokeWidth={isSel ? 2 : 1}
            />
            {variant === 'editorial' && <path d={d} fill="url(#hatch)" opacity="0.15"/>}
          </g>
        );
      })}

      {/* Outage points */}
      {pts.map((p, i) => (
        <g key={p.id}>
          {pulse && (
            <circle cx={p.x} cy={p.y} r="6" fill={palette.high} opacity="0.6">
              <animate attributeName="r" values="4;14;4" dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0;0.6" dur={`${2 + (i % 3) * 0.4}s`} repeatCount="indefinite"/>
            </circle>
          )}
          <circle cx={p.x} cy={p.y} r="3" fill={palette.high} stroke={palette.bg} strokeWidth="1"/>
        </g>
      ))}

      {/* City pins */}
      {showPins && Object.entries(CITY_PINS).map(([name, p]) => (
        <g key={name}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={palette.bg} stroke={palette.fg} strokeWidth="1.5"/>
          <text x={p.x + 8} y={p.y + 4} fontFamily="IBM Plex Mono, monospace" fontSize="11"
                fill={palette.fg} fontWeight="500">{name}</text>
        </g>
      ))}

      {/* State labels with stats */}
      {Object.entries(STATE_CENTROIDS).map(([code, c]) => {
        const count = stats[code].count;
        return (
          <g key={code} style={{ pointerEvents: 'none' }}>
            <text x={c.x} y={c.y - 6} fontFamily="IBM Plex Mono, monospace" fontSize="13"
                  fill={palette.fg} fontWeight="600" textAnchor="middle">{code}</text>
            <text x={c.x} y={c.y + 10} fontFamily="IBM Plex Mono, monospace" fontSize="10"
                  fill={palette.dim} textAnchor="middle">{count} active</text>
          </g>
        );
      })}

      {/* Coord ticks for ops feel */}
      {variant === 'ops' && (
        <g fontFamily="IBM Plex Mono, monospace" fontSize="9" fill={palette.dim} opacity="0.6">
          <text x="50" y="115">10°S</text>
          <text x="50" y="320">25°S</text>
          <text x="50" y="525">35°S</text>
          <text x="50" y="700">43°S</text>
          <text x="100" y="715">115°E</text>
          <text x="400" y="715">130°E</text>
          <text x="700" y="715">145°E</text>
        </g>
      )}
    </svg>
  );
}

window.AusMap = AusMap;
