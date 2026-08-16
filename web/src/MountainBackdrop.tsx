// Decorative backdrop for the ride-recording map. Loosely inspired by illustrated bike-park
// trail maps (layered ridgelines, snow caps, dusk sky) but drawn from scratch - not a copy of
// any real map. Plain SVG markup (not JSX) because it needs to be a raster-ish `url` for
// Leaflet's ImageOverlay, which is what lets it stay pinned to the trail geography instead of
// just being a static CSS layer that ignores pan/zoom.
const MOUNTAIN_BACKDROP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <defs>
    <linearGradient id="mtb-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="400" height="220" fill="url(#mtb-sky)" />

  <path d="M -10 150 L 40 50 L 80 130 L 130 10 L 190 55 L 240 25 L 290 130 L 340 45 L 410 150 L 410 220 L -10 220 Z" fill="#475569" opacity="0.55" />
  <path d="M 30 56 L 40 50 L 50 58 L 42 60 L 38 60 Z" fill="#e2e8f0" opacity="0.6" />
  <path d="M 122 18 L 130 10 L 140 20 L 130 22 L 124 21 Z" fill="#e2e8f0" opacity="0.6" />
  <path d="M 232 33 L 240 25 L 250 35 L 240 36 L 234 35 Z" fill="#e2e8f0" opacity="0.6" />

  <path d="M -10 180 L 30 90 L 90 175 L 150 55 L 210 170 L 270 70 L 330 175 L 410 140 L 410 220 L -10 220 Z" fill="#334155" opacity="0.8" />
  <path d="M 20 98 L 30 90 L 40 100 L 30 101 L 24 100 Z" fill="#cbd5e1" opacity="0.5" />
  <path d="M 140 63 L 150 55 L 160 65 L 150 67 L 144 66 Z" fill="#cbd5e1" opacity="0.5" />
</svg>
`.trim()

export const MOUNTAIN_BACKDROP_URL = `data:image/svg+xml,${encodeURIComponent(MOUNTAIN_BACKDROP_SVG)}`
