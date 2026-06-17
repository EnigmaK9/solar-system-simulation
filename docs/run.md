# Run

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge — any browser with WebGL 2.0)
- Python 3, Node.js, or PHP (for a local HTTP server)
- **Important:** ES modules require an HTTP server. Opening `index.html` directly from disk (`file://`) will not work due to CORS restrictions on module imports.

## Commands

### Option 1 — Local HTTP server (recommended)

```bash
cd solar-system-simulation
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

### Option 2 — Node.js server

```bash
npx serve solar-system-simulation
```

### Option 3 — PHP built-in server

```bash
php -S localhost:8080 -t solar-system-simulation
```

## Controls

| Input | Action |
|-------|--------|
| Left-click + drag | Orbit around the solar system |
| Scroll wheel | Zoom in / out |
| Right-click + drag | Pan the view |
| Click a planet | Lock camera focus on that planet |
| Click empty space | Release focus, return to free roam |

## UI Buttons

| Button | Action |
|--------|--------|
| − Slower | Reduce simulation speed by 0.25× |
| 1× | Reset speed to default |
| Faster + | Increase simulation speed by 0.25× |
| Top View | Jump camera to bird's-eye view |
| Orbit Cam | Auto-orbit around the focused planet |

## Troubleshooting

**Blank black screen?** Open the browser console (F12). If you see a WebGL error, your GPU or browser may not support WebGL 2.0. Try Chrome or Firefox.

**Planets not moving?** Click the **1×** button to reset speed. The simulation may have been paused at 0.1×.

**Low framerate?** The simulation targets 60fps. On older hardware, reduce the window size or close other GPU-heavy tabs.

**Server already running?** If port 8080 is taken, use a different port:
```bash
python3 -m http.server 9090
```
