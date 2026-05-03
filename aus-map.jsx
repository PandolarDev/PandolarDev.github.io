// Leaflet-powered outage map for Australia

const STATE_CENTROIDS_LL = {
  WA:  [-26.0, 121.0],
  NT:  [-20.0, 134.0],
  SA:  [-30.0, 135.5],
  QLD: [-22.0, 144.0],
  NSW: [-32.5, 147.0],
  VIC: [-37.0, 144.0],
  TAS: [-42.0, 146.5],
};

const CITY_COORDS = {
  Sydney:    [-33.87, 151.21],
  Melbourne: [-37.81, 144.96],
  Brisbane:  [-27.47, 153.03],
  Perth:     [-31.95, 115.86],
  Adelaide:  [-34.93, 138.60],
  Hobart:    [-42.88, 147.33],
  Darwin:    [-12.46, 130.84],
  Canberra:  [-35.28, 149.13],
};

function severityColor(customers, palette) {
  if (customers === 0) return palette.ok;
  if (customers <= 100) return palette.low;
  if (customers <= 500) return palette.med;
  return palette.high;
}

let _pulseStyleInjected = false;
function ensurePulseStyle() {
  if (_pulseStyleInjected) return;
  _pulseStyleInjected = true;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes outage-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.65; }
      70%  { transform: scale(2.8); opacity: 0; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    .outage-pulse-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
    .outage-pulse-ring {
      position: absolute;
      border-radius: 50%;
      animation: outage-pulse-ring 2.2s ease-out infinite;
      pointer-events: none;
    }
    .outage-dot {
      position: relative;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.45);
    }
    .leaflet-tooltip.city-pin-label {
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0 0 0 4px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .leaflet-tooltip.city-pin-label::before { display: none; }
  `;
  document.head.appendChild(s);
}

function makePopupHtml(o) {
  const op = (window.OPERATORS || []).find(x => x.id === o.operator);
  const fmtN = n => n.toLocaleString();
  return `
    <div style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;min-width:220px;line-height:1.6;">
      <div style="font-weight:600;font-size:15px;margin-bottom:2px;">${o.suburb}, ${o.state} ${o.postcode}</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#888;margin-bottom:8px;">${o.id}${op ? ' · ' + op.name : ''}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;">
        <div><span style="color:#888">customers </span><strong>${fmtN(o.customers)}</strong></div>
        <div><span style="color:#888">cause </span>${o.cause}</div>
        <div><span style="color:#888">status </span>${o.status}</div>
        <div><span style="color:#888">voltage </span>${o.voltage || '—'}</div>
      </div>
    </div>`;
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
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const tileLayerRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const pinMarkersRef = React.useRef([]);
  const onSelectStateRef = React.useRef(onSelectState);

  React.useEffect(() => { onSelectStateRef.current = onSelectState; }, [onSelectState]);

  const isDark = palette.bg.startsWith('#0') || palette.bg.startsWith('#1') || palette.bg.startsWith('#2');
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  // Initialize map once
  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensurePulseStyle();

    const map = L.map(containerRef.current, {
      center: [-27, 134],
      zoom: 4,
      minZoom: 3,
      maxZoom: 13,
      scrollWheelZoom: true,
      attributionControl: true,
      zoomControl: true,
    });

    map.attributionControl.setPrefix('');
    map.fitBounds([[-44, 112], [-10, 154]]);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersRef.current = [];
      pinMarkersRef.current = [];
    };
  }, []);

  // Swap tile layer when dark/light changes
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }
    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [tileUrl]);

  // Outage markers
  React.useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const liveOutages = outages.filter(o => o.type === 'live' && o.lat && o.lng);

    for (const o of liveOutages) {
      const color = severityColor(o.customers, palette);
      const r = Math.max(6, Math.min(20, Math.sqrt(o.customers) / 4));

      let marker;
      if (pulse) {
        const wrapSize = r * 6;
        const delay = (o.id.charCodeAt(4) % 5) * 0.44;
        const icon = L.divIcon({
          className: '',
          html: `<div class="outage-pulse-wrap" style="width:${wrapSize}px;height:${wrapSize}px;">
                   <div class="outage-pulse-ring" style="width:${r * 2}px;height:${r * 2}px;background:${color};animation-delay:${delay}s;"></div>
                   <div class="outage-dot" style="width:${r * 2}px;height:${r * 2}px;background:${color};"></div>
                 </div>`,
          iconSize: [wrapSize, wrapSize],
          iconAnchor: [wrapSize / 2, wrapSize / 2],
          popupAnchor: [0, -(wrapSize / 2)],
        });
        marker = L.marker([o.lat, o.lng], { icon });
      } else {
        marker = L.circleMarker([o.lat, o.lng], {
          radius: r,
          fillColor: color,
          color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
          weight: 1.5,
          fillOpacity: 0.8,
        });
      }

      marker.bindPopup(makePopupHtml(o), { maxWidth: 280 });
      marker.on('click', () => onSelectStateRef.current(o.state));
      marker.addTo(mapRef.current);
      markersRef.current.push(marker);
    }
  }, [outages, palette, pulse, isDark]);

  // City pin markers
  React.useEffect(() => {
    if (!mapRef.current) return;

    pinMarkersRef.current.forEach(m => m.remove());
    pinMarkersRef.current = [];

    if (!showPins) return;

    for (const [name, coords] of Object.entries(CITY_COORDS)) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:8px;height:8px;border-radius:50%;background:${palette.bg};border:2px solid ${palette.fg};box-shadow:0 0 0 1px rgba(0,0,0,0.2);"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      const marker = L.marker(coords, { icon, interactive: false, zIndexOffset: -100 });
      marker.bindTooltip(name, {
        permanent: true,
        direction: 'right',
        className: 'city-pin-label',
        offset: [6, 0],
      });
      marker.addTo(mapRef.current);
      pinMarkersRef.current.push(marker);
    }
  }, [showPins, palette]);

  // City label color tracks palette
  React.useEffect(() => {
    let el = document.getElementById('aus-map-city-label-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'aus-map-city-label-style';
      document.head.appendChild(el);
    }
    el.textContent = `.leaflet-tooltip.city-pin-label { color: ${palette.fg} !important; }`;
  }, [palette.fg]);

  // Invalidate size when height changes (e.g. variant switch)
  React.useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(timer);
  }, [height]);

  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: cssHeight, minHeight: typeof height === 'number' ? height : 300 }}
    />
  );
}

window.AusMap = AusMap;
