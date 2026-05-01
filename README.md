# Handoff: Outage Tracker — Australia

## Overview
A consumer-facing web app that aggregates power outage data from network operators across Australia. The general public uses it to check whether their address is affected, see what's happening regionally, and subscribe to alerts. Operations staff use it to view active incidents and manage data ingestion sources.

The tone is **terse and technical** (operations-leaning) but the audience is the general public — short labels, monospace numerics, civic-utility feel rather than warm/marketing.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior. They are NOT production code to copy directly. The task is to **recreate these HTML designs in the target codebase's existing environment** (React, Next.js, SvelteKit, etc.) using its established patterns, component library, routing, and data layer. If no codebase exists yet, **Next.js (App Router) + TypeScript + Tailwind** is a good default for this kind of dashboard.

The HTML uses inline-styled React-via-Babel for fast iteration; production should use the codebase's normal styling solution.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, layout structure, and interactions. The developer should recreate the UI pixel-perfectly using the codebase's existing libraries and patterns. Layout variants in the prototype (Civic / Ops / Editorial / Cards / Map-first) are *design exploration* — pick the **Civic** variant as the production default; the others are reference for future variations.

The user's last-saved settings indicate the production target should be: **Civic variant, dark mode, compact density, no weather overlay.** Use these as defaults but make them user-toggleable.

## Tech Stack Recommendation
- **Framework:** Next.js 14+ App Router (or SvelteKit / Remix)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with CSS variables for the palette tokens (so palette switching works)
- **State:** React Server Components for data, `zustand` or React Context for UI state (filters, selected incident, theme)
- **Map:** Replace the schematic SVG with **MapLibre GL JS** + a real Australia tile source (e.g. Mapbox / MapTiler / OS basemap) and overlay live outage GeoJSON. The current schematic is intentional placeholder geography.
- **Data fetching:** Server-side aggregation from operator feeds (see Data Sources screen) with periodic revalidation. Use `fetch` with `next: { revalidate: 30 }` for the overview page.
- **Realtime:** Server-Sent Events or WebSockets for live outage updates; fall back to polling every 30s.
- **Address geocoding:** Use Geoscape Predictive Address API or Mapbox Geocoder (Australia bounding box).

## Routes / Screens

### `/` — Overview (Landing)
**Purpose:** At-a-glance national status; primary entry point.

**Layout:** Sidebar (200px fixed) + main column (flex 1).

**Main column structure (top → bottom):**
1. Stat strip — 4 stats in a row, full bleed, 1px border between (`Active outages`, `Customers affected`, `Median ETR`, `Planned 24h`)
2. Map row — flex row: schematic Australia SVG (flex 1, padded 16px) + right panel (280px, `By operator` and `Top causes` horizontal bar charts)
3. Tabs — `Live | Planned | History` with counts; active tab has 2px bottom border in `--accent`
4. Filters bar — state, operator, cause, status dropdowns + free text search + clear button. Background `--surface-alt`.
5. Table header — sticky, monospace uppercase 10px labels
6. Table body — scrollable, rows are clickable to open Incident panel

**Table row columns** (CSS grid: `120px 60px 1fr 140px 90px 130px 110px`, gap 12px, padding `10px 14px`):
- ID (mono, dim, 11px) — e.g. `OUT-2046123`
- State (mono, fg, 12px, bold) — e.g. `NSW`
- Suburb + postcode — Sans 13px + mono 11px dim
- Operator name — Sans 12px
- Customers affected — mono 12px
- Cause — Sans 12px
- Status — `<SevBadge>` (see Components)

### `/region/[code]` — Region Detail
**Purpose:** State-level drill-in (NSW / VIC / QLD / WA / SA / TAS / NT).

**Layout:**
1. Header — `Region` label + state name H2 (32px, weight 600, letter-spacing -0.01em) + state code/timezone meta + state-switcher chip row
2. 4-stat grid — Active in region / Customers affected / Operators affected / Region uptime 30d
3. Two-column body — left (1.2fr): list of active outages in this state, clickable to open incident; right (1fr): 30-day sparkline (svg bar chart), then operators-in-region list with customer counts.

### `/lookup` — Address Lookup
**Purpose:** Public "is my power out" check.

**Layout:** Single centered column, max-width 760px.
- H2 (28px) "Check power status at an address."
- Address input + "Check" button (square buttons, no border-radius — this is a system rule, see Tokens)
- Sample-address chips below (clickable to populate input)
- Result card on submit — green dot + "No outages reported" OR red dot + "Power is out at this address." with details (outage ID, operator, cause, started, ETR, customers) and CTA "Open incident →"

**Behavior:** Geocode → reverse lookup against active outages by polygon. The HTML prototype uses a crude string match; production should use proper postcode/lat-lng matching.

### `/alerts` — Subscribe to Alerts
**Purpose:** Sign up for email/SMS/push notifications about a watched address.

**Layout:** Centered, max-width 880px. Two-column grid (1.2fr / 1fr).
- Left: form card — Watch address, Email, SMS, Channels (checkboxes: email/sms/push), Notify about (live/planned/restored), Threshold (any / 500+ / 1000+ / state). Submit button is solid `--fg` background, `--bg` text.
- Right: active subscriptions list — each entry shows address, channels, types, and a "remove" link.

**Behavior:** POST to `/api/subscriptions`. On success, append to subscription list and clear address field; show "✓ Saved" on the submit button for 1.8s.

### `/sources` — Data Sources Manager
**Purpose:** Operations view to manage which feeds the tracker ingests from. Each operator (Ausgrid, Energex, etc. in production) typically exposes a GeoJSON / API / CSV / RSS / Webhook / WMS / Scrape endpoint.

**Layout:**
- Header row: title + count + status summary on left; `+ Add source` button on right (use `flex-shrink: 0; white-space: nowrap` on the button and `flex: 1; min-width: 0` on the left column).
- Inline add-source form (toggled): name, type select, URL, Connect button.
- Table — 6 columns (Source / Type / Status / Last sync / Records / Actions). Status is a colored dot + text (live=ok green, degraded=med amber, paused=dim). Actions: pause/resume + delete.

**Behavior:**
- `GET /api/sources` → list
- `POST /api/sources` → add new
- `PATCH /api/sources/:id` → toggle pause
- `DELETE /api/sources/:id` → remove
- Each source independently polls its endpoint at its own cadence; "Last sync" shows seconds since last successful pull.

### Incident Detail Panel (slide-over, all screens)
**Purpose:** Full detail of a single outage. Renders as a 460px-wide right slide-over with `box-shadow: -12px 0 32px <shadow>`.

**Sections:**
1. Header — outage ID + status badge + suburb/state/postcode H3 + operator + close button
2. Detail grid — 2-col, 1px-gap-as-divider grid: Customers, Cause, Started, ETR, Voltage, Crews
3. Timeline — vertical timeline, left border 1px in `--border-soft`, dot-on-line per event. Events: detected → operator notified → crew dispatched → investigating → estimated restoration (last one is hollow dot for future)
4. Affected feeders box — surface-alt background, mono 11px text listing feeder/zone-substation/transformer IDs
5. Footer — "Subscribe to updates" (solid fg button) + "Share" (outline button)

**Behavior:** Opens on row click; closes on ✕, Escape, or outside click. URL hash updates to `#incident=<id>` for shareable links.

## Components

### `<SevBadge status>`
Pill-shaped severity badge. **NOT rounded** — corners 2px radius. Border + colored text only (no fill).
- Investigating → `--high` (red)
- Crew dispatched / Crew on site → `--med` (amber)
- Power restored → `--ok` (green)
- Scheduled → `--low` (blue/lime depending on palette)

Style: 1px solid current color, `padding: 3px 7px`, `font-family: mono`, `font-size: 10px`, `font-weight: 600`, `letter-spacing: 0.04em`, `text-transform: uppercase`.

### `<Stat label value sub accent?>`
Stat block. Border 1px `--border`, background `--surface`, `padding: 14px 18px`.
- Label: mono 10px uppercase letter-spacing 0.06em `--dim`
- Value: mono 28px weight 600, line-height 1, optional accent color override
- Sub: mono 11px `--dim`

### `<Sidebar>`
Width 200px, `--surface` bg, 1px right border. Brand block at top (10×10 accent square + "AU · Outage / Tracker" mono labels). Nav items: Overview, Address, Region, Alerts, Data sources. Active item: 2px left border in `--accent`, `--row-selected` background, `--fg` text. Inactive items use `--dim` text. Bottom block: "Status" — sources count, last sync, uptime.

Glyph column (◐ ◇ ◭ ◈ ◌) — these are unicode glyphs as compact icons. Replace with a proper icon set in production (Lucide / Phosphor recommended).

### `<TabsHeader>`
Three tabs (Live / Planned / History) with counts. Active: 2px bottom border in `--accent`, fg color. Inactive: dim color, transparent border.

### `<FiltersBar>`
Horizontal flex with 8px gap, `padding: 10px 14px`, `--surface-alt` bg. Each select/input is 32px tall, 1px border, square corners, mono 12px. "clear" button is plain text-styled.

### `<AusMap>` (placeholder — replace with MapLibre)
Currently an SVG with hand-drawn schematic state polygons (1000×720 viewBox). For production:
- Use MapLibre GL JS with a vector tile basemap.
- State polygons: ASGS Statistical Area shapefiles from ABS.
- Outage markers: GeoJSON points fed from the aggregation service. Pulse animation = CSS keyframes on a stroked circle behind the marker.
- Weather overlay: BoM radar WMS or Mapbox weather layer.
- City pins: 8 capitals + Canberra; show always.

### `<TweaksPanel>`
This is a **prototype-only** floating panel — do NOT ship to production. It exists so designers/PM can A/B layout variants in the prototype. Remove for the real app; expose only the user-facing settings (theme + density) via a normal Settings page.

## Design Tokens

Use CSS variables so palette/dark-mode switching is trivial. Token shape:

```css
:root {
  /* Civic light (production default for marketing pages) */
  --bg: #fafaf7;
  --surface: #ffffff;
  --surface-alt: #f1f0eb;
  --fg: #1a1a18;
  --dim: #6b6963;
  --border: #dcd9d0;
  --border-soft: #ebe9e2;
  --row-hover: #f4f3ed;
  --row-selected: #e8e6dd;
  --accent: #0f766e;
  --ok: #0f766e;
  --low: #65a30d;
  --med: #f59e0b;
  --high: #dc2626;
  --state-stroke: #cfccc2;
  --grid-line: #b8b5ac;
  --shadow: rgba(20,20,18,0.18);
}

[data-theme="dark"] {
  /* Civic dark — production app default per user's saved tweak */
  --bg: #0f1210;
  --surface: #161a18;
  --surface-alt: #1e2320;
  --fg: #ecebe6;
  --dim: #8e8d87;
  --border: #2a2f2c;
  --border-soft: #1f2421;
  --row-hover: #1a1f1c;
  --row-selected: #222824;
  --accent: #2dd4bf;
  --ok: #2dd4bf;
  --low: #a3e635;
  --med: #fbbf24;
  --high: #f87171;
  --state-stroke: #2f3531;
  --grid-line: #3a4039;
  --shadow: rgba(0,0,0,0.6);
}
```

Alternate palettes (`Warm`, `Mono`) are in `palettes.jsx` if you want to expose them as theme options.

### Typography
- **Sans:** IBM Plex Sans (400 / 500 / 600 / 700) — UI labels, headings, body
- **Mono:** IBM Plex Mono (400 / 500 / 600) — IDs, numerics, timestamps, eyebrow labels, statuses, voltages
- Load via Google Fonts: `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`

### Type scale
| Use | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| Page H1 (Editorial only) | Sans | 56px | 600 | -0.02em |
| Screen H2 | Sans | 28-32px | 600 | -0.01em |
| Panel H3 | Sans | 22px | 600 | -0.01em |
| Stat value | Mono | 28px | 600 | normal |
| Card title | Sans | 14-16px | 600 | normal |
| Body | Sans | 13-14px | 400 | normal |
| Eyebrow / table header | Mono | 10px | 400 UPPERCASE | 0.08em |
| Meta / ID | Mono | 11px | 400 | normal |

### Spacing
8px base. Common values: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32. Stat block padding `14px 18px`. Table row padding `10px 14px` (compact: `6px 14px`). Panel padding `20px`.

### Borders / Radii
**System rule: corners are square (border-radius 0)** for all containers, buttons, inputs. The only rounding in the system is:
- Severity badge: `2px`
- Status dots: `50%`
- Avatar/dots: `50%`

This is intentional — keeps the civic/ops aesthetic. Don't add rounded buttons.

Border weights: `1px` everywhere. Use `--border` for primary, `--border-soft` for table row separators (lower contrast).

### Density
- **Comfortable** (default): row padding `10px 14px`
- **Compact** (user's saved tweak): row padding `6px 14px`

Should be a user setting, persisted to localStorage and/or user profile.

## Interactions & Behavior

- **Row click → open incident panel.** URL updates to `?incident=<id>`. Panel is keyboard-dismissible (Escape).
- **Map state click → navigate to `/region/[code]`.** Mark the state as selected.
- **Tab change** → swap data source for the table; preserve filters.
- **Filter change** → debounce 200ms then re-query.
- **Free-text search** → matches suburb name, postcode, or outage ID.
- **Subscription submit** → POST, append to list, clear form, show "✓ Saved" on button for 1800ms then revert to "Subscribe".
- **Source pause/resume/delete** → optimistic UI update + API call + toast on error.
- **Live pulse** — the radial pulse animation on outage markers is a designer toggle in the prototype. In production, only animate when document is visible (`document.visibilityState === 'visible'`) and respect `prefers-reduced-motion`.
- **Polling** — refresh outages every 30s. Pause when tab is hidden.

## State Management

```ts
// Global UI state (zustand)
interface UIState {
  theme: 'light' | 'dark';
  palette: 'civic' | 'warm' | 'mono';
  density: 'compact' | 'comfortable';
  pulse: boolean;
  weatherOverlay: boolean;
  selectedIncidentId: string | null;
  filters: { state: string; operator: string; cause: string; status: string; q: string };
  tab: 'live' | 'planned' | 'history';
}

// Server state (React Query / SWR)
useOutages({ tab, filters }) // GET /api/outages?type=live&state=NSW...
useOutage(id)                // GET /api/outages/:id (full timeline)
useRegion(code)              // GET /api/region/:code
useSources()                 // GET /api/sources
useSubscriptions()           // GET /api/subscriptions
```

## Data Model (suggested)

```ts
type Outage = {
  id: string;            // OUT-2046123
  type: 'live' | 'planned' | 'history';
  operator: string;      // operator id
  state: AusState;       // NSW | VIC | QLD | WA | SA | TAS | NT
  suburb: string;
  postcode: number;
  cause: 'Storm' | 'Equipment fault' | 'Vehicle impact' | 'Vegetation' | 'Planned works' | 'Bushfire' | 'Animal contact' | 'Unknown';
  status: 'Investigating' | 'Crew dispatched' | 'Crew on site' | 'Power restored' | 'Scheduled';
  customers: number;
  startedAt: number;     // epoch ms
  etr: number;           // epoch ms
  lat: number;
  lng: number;
  voltage: 'LV 415V' | 'HV 11kV' | 'HV 22kV' | 'HV 33kV';
  crews: number;
  durationMin?: number;  // history only
  worktype?: string;     // planned only
  feeders?: string[];
  zoneSubstation?: string;
};

type Operator = {
  id: string;
  name: string;          // fictional in prototype — replace with real names (Ausgrid, Endeavour Energy, Essential Energy, Energex, Ergon, Powercor, Jemena, AusNet, CitiPower, United Energy, SA Power Networks, Western Power, Horizon Power, TasNetworks, PWC)
  state: AusState;
  customers: number;
};

type DataSource = {
  id: string;
  name: string;
  type: 'API' | 'GeoJSON' | 'JSON' | 'CSV' | 'Webhook' | 'RSS' | 'WMS' | 'Scrape';
  url: string;
  status: 'live' | 'degraded' | 'paused';
  lastSync: number;      // epoch ms
  records: number;
};
```

## Important: Real Operator Names
The prototype uses **fictional operator names** (GridLink NSW, Eastern Networks, etc.) to avoid implying any specific company's branding. In production, replace with real Australian DNSPs:

- **NSW:** Ausgrid, Endeavour Energy, Essential Energy
- **VIC:** AusNet Services, CitiPower, Jemena, Powercor, United Energy
- **QLD:** Energex, Ergon Energy
- **WA:** Western Power, Horizon Power
- **SA:** SA Power Networks
- **TAS:** TasNetworks
- **NT:** Power and Water Corporation (PWC)

Cross-state market operator: AEMO (use for market notices feed).

## Files in This Bundle
- `Outage Tracker.html` — entry HTML, mounts the React app
- `palettes.jsx` — three color palettes × light/dark
- `data.jsx` — mock outage / operator / source data + seeded RNG
- `aus-map.jsx` — schematic Australia SVG map (replace with MapLibre)
- `components.jsx` — shared primitives (SevBadge, Stat, OutageRow, FiltersBar, TabsHeader, Sidebar)
- `screen-overview.jsx` — Overview screen + 4 layout variants (Standard, Editorial, Cards, Map-first)
- `screens-other.jsx` — Region, Lookup, Alerts, Sources, Incident detail panel
- `browser-window.jsx` — prototype-only chrome wrapper (drop in production)
- `tweaks-panel.jsx` — prototype-only design controls (drop in production)

## Assets
No proprietary assets. Fonts via Google Fonts (IBM Plex Sans + IBM Plex Mono — open-source SIL OFL). Icons are unicode glyphs in the prototype — swap for a real icon library (Lucide recommended) in production.

## Suggested Build Order
1. Set up tokens + dark mode toggle + Plex fonts
2. Sidebar + routing shell
3. Overview screen with mock data, no map yet (placeholder div)
4. Filters + tabs + table with virtual scrolling (`@tanstack/react-virtual`) — there will be hundreds of rows
5. Incident slide-over panel
6. Region detail page
7. Address lookup with real geocoding
8. Alerts (subscriptions API + email/SMS provider integration)
9. Data sources manager + ingestion service (separate worker process)
10. Replace placeholder map with MapLibre + real outage GeoJSON feed
11. Realtime updates (SSE)
12. Density / palette user settings, persisted

## Out of Scope for V1
- Operator login (this is a public consumer app, not a utility's portal)
- Outage reporting (users report to their operator directly — link out)
- Historical analytics beyond 30-day region sparkline
- Mobile app (responsive web first)
