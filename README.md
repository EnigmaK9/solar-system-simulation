# Solar System — WebGL Simulation

A real-time 3D solar system built with **Three.js** and **WebGL**, running entirely in the browser. All eight planets orbit a procedurally textured Sun with multi-layer glow effects, corona rays, and an asteroid belt.

## Features

- **Procedural Sun** — canvas-generated surface texture with granulation, sunspots, and faculae, animated via a custom vertex-shader convection system
- **5-layer glow** — Fresnel-based additive glow shells from white-hot core to wide red halo, each independently animated
- **Corona rays & flare particles** — sprite-based light spikes and floating ember particles around the Sun
- **8 Planets** — Mercury through Neptune with relative sizes, orbital distances, and speeds
- **Saturn's rings** — double-ring system with tilt
- **Asteroid belt** — 1,800 particles between Mars and Jupiter
- **Orbit lines** — semi-transparent circular paths for every planet
- **Starfield** — 4,000 stars with color variation in a spherical distribution
- **Interactive camera** — drag to orbit, scroll to zoom, click a planet to focus
- **Orbit Cam mode** — automatically circle around a focused planet
- **Speed controls** — adjustable simulation speed from 0.1× to 5.0×
- **Top-down view** — one-click bird's-eye perspective of the entire system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Engine | [Three.js](https://threejs.org/) v0.160 (ES modules via CDN) |
| Graphics API | WebGL 2.0 |
| Shaders | GLSL (custom vertex & fragment shaders) |
| Camera | `OrbitControls` from Three.js addons |
| Modules | Native ES modules (no bundler, no framework) |

## Quick Start

```bash
cd solar-system-simulation
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

> **Note:** ES modules require an HTTP server. Opening `index.html` directly from disk will fail due to CORS restrictions on `file://` URLs.

## Project Structure

```
solar-system-simulation/
├── index.html              # Thin entry point (HTML + CSS + import map)
├── README.md
├── src/
│   ├── main.js             # Orchestrator: wires modules, owns state, starts loop
│   ├── config.js           # All tunable constants + planet definitions
│   ├── scene-setup.js      # Scene, renderer, camera, OrbitControls, resize
│   ├── starfield.js        # 4,000 background stars (THREE.Points)
│   ├── sun.js              # Sun: texture, surface shader, 5 glow shells, corona, flares
│   ├── planets.js          # 8 planets with pivots, rings, orbit lines
│   ├── asteroid-belt.js    # 1,800 particles between Mars & Jupiter
│   ├── interactions.js     # Mouse raycaster: hover tooltip + click-to-focus
│   ├── camera-controller.js# Smooth camera animation + planet follow + orbit cam
│   ├── ui-controls.js      # Speed/camera button handlers
│   └── render-loop.js      # requestAnimationFrame loop
└── docs/
    ├── architecture.md     # System design and data flow
    ├── flowchart.md        # Visual flowchart (Mermaid diagrams)
    └── run.md              # Run commands and troubleshooting
```

### Module Dependency Graph

```
config.js  ← pure data, no imports
    │
    ├──→ scene-setup.js  ← three
    ├──→ starfield.js    ← three
    ├──→ sun.js          ← three
    ├──→ asteroid-belt.js← three
    ├──→ camera-controller.js ← three
    ├──→ render-loop.js  ← three
    │
    planets.js  ← three (uses planetDefs from caller)
    interactions.js ← three (uses planets from caller)
    ui-controls.js ← three (uses refs from caller)
        │
        └──→ main.js  ← orchestrates all, owns shared state
                 │
                 └──→ index.html  ← thin shell, <script type="module" src="./src/main.js">
```

## Browser Support

Any modern browser with WebGL 2.0 support: Chrome, Firefox, Safari, Edge.

## License

MIT
