// Leaflet-powered outage map for Australia

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

function tileUrlFor(isDark) {
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
}

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
    .outage-dot { position: relative; border-radius: 50%; border: 2px solid rgba(255,255,255,0.45); }
    .leaflet-tooltip.city-pin-label {
      background: transparent; border: none; box-shadow: none;
      padding: 0 0 0 4px;
      font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; white-space: nowrap;
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
  onSelectState = () => {},
  palette,
  pulse = true,
  showPins = true,
  height = 460,
}) {
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const tileLayerRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const pinMarkersRef = React.useRef([]);
  const onSelectStateRef = React.useRef(onSelectState);
  const [mapReady, setMapReady] = React.useState(false);

  React.useEffect(() => { onSelectStateRef.current = onSelectState; }, [onSelectState]);

  const isDark = palette.bg.startsWith('#0') || palette.bg.startsWith('#1') || palette.bg.startsWith('#2');

  // ── Init: runs once. Uses setTimeout(0) so the browser has laid out the
  //    flex/overflow parents before Leaflet measures offsetHeight.
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    ensurePulseStyle();

    let map;
    const t = setTimeout(() => {
      if (mapRef.current) return;

      map = L.map(container, {
        center: [-27, 134],
        zoom: 4,
        minZoom: 3,
        maxZoom: 13,
        scrollWheelZoom: true,
        attributionControl: true,
        zoomControl: true,
      });

      map.attributionControl.setPrefix('');

      const tl = L.tileLayer(tileUrlFor(isDark), {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      tileLayerRef.current = tl;
      map.fitBounds([[-44, 112], [-10, 154]]);
      mapRef.current = map;

      // Trigger marker/pin effects and catch any remaining sizing edge-cases
      setTimeout(() => map.invalidateSize(), 150);
      setMapReady(true);
    }, 0);

    return () => {
      clearTimeout(t);
      if (map) {
        map.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        markersRef.current = [];
        pinMarkersRef.current = [];
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swap tile URL when dark/light changes (after initial mount)
  React.useEffect(() => {
    const tl = tileLayerRef.current;
    if (!tl) return;
    tl.setUrl(tileUrlFor(isDark));
  }, [isDark]);

  // ── Outage markers
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
        marker = L.marker([o.lat, o.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="outage-pulse-wrap" style="width:${wrapSize}px;height:${wrapSize}px;">
                     <div class="outage-pulse-ring" style="width:${r*2}px;height:${r*2}px;background:${color};animation-delay:${delay}s;"></div>
                     <div class="outage-dot" style="width:${r*2}px;height:${r*2}px;background:${color};"></div>
                   </div>`,
            iconSize: [wrapSize, wrapSize],
            iconAnchor: [wrapSize / 2, wrapSize / 2],
            popupAnchor: [0, -(wrapSize / 2)],
          }),
        });
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
      marker.addTo(map);
      markersRef.current.push(marker);
    }
  }, [mapReady, outages, palette, pulse, isDark]);

  // ── City pins
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    pinMarkersRef.current.forEach(m => m.remove());
    pinMarkersRef.current = [];

    if (!showPins) return;

    for (const [name, coords] of Object.entries(CITY_COORDS)) {
      const marker = L.marker(coords, {
        interactive: false,
        zIndexOffset: -100,
        icon: L.divIcon({
          className: '',
          html: `<div style="width:8px;height:8px;border-radius:50%;background:${palette.bg};border:2px solid ${palette.fg};box-shadow:0 0 0 1px rgba(0,0,0,0.2);"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        }),
      });
      marker.bindTooltip(name, { permanent: true, direction: 'right', className: 'city-pin-label', offset: [6, 0] });
      marker.addTo(map);
      pinMarkersRef.current.push(marker);
    }
  }, [mapReady, showPins, palette]);

  // ── City label text colour tracks palette
  React.useEffect(() => {
    let el = document.getElementById('aus-map-city-label-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'aus-map-city-label-style';
      document.head.appendChild(el);
    }
    el.textContent = `.leaflet-tooltip.city-pin-label { color: ${palette.fg} !important; }`;
  }, [palette.fg]);

  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: cssHeight, minHeight: typeof height === 'number' ? height : 300 }}
    />
  );
}

window.AusMap = AusMap;
