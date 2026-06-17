# Architecture

## Overview

The application uses a **modular ES module architecture** with no build step. Three.js is loaded from a CDN via import maps. Each concern lives in its own file under `src/`. The HTML file (`index.html`) is a thin shell — only CSS and a single `<script type="module">` tag that imports `src/main.js`.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  index.html (thin shell)                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │   │
│  │  │   HTML    │  │   CSS    │  │ <script type=module│  │   │
│  │  │  (HUD,   │  │ (layout, │  │  src="./src/main"  │  │   │
│  │  │  buttons)│  │  theme)  │  │       │             │  │   │
│  │  └──────────┘  └──────────┘  └───────┬─────────────┘  │   │
│  │                                       │                │   │
│  │                          ┌────────────▼────────────┐   │   │
│  │                          │    src/ (12 modules)    │   │   │
│  │                          │  config.js              │   │   │
│  │                          │  scene-setup.js         │   │   │
│  │                          │  starfield.js           │   │   │
│  │                          │  sun.js                 │   │   │
│  │                          │  planets.js             │   │   │
│  │                          │  asteroid-belt.js       │   │   │
│  │                          │  interactions.js        │   │   │
│  │                          │  camera-controller.js   │   │   │
│  │                          │  ui-controls.js         │   │   │
│  │                          │  render-loop.js         │   │   │
│  │                          │  main.js (orchestrator) │   │   │
│  │                          └─────────┬──────────────┘   │   │
│  │                                    │                  │   │
│  │                          ┌─────────▼──────────────┐   │   │
│  │                          │   Three.js API (CDN)   │   │   │
│  │                          └─────────┬──────────────┘   │   │
│  │                                    │                  │   │
│  │                          ┌─────────▼──────────────┐   │   │
│  │                          │      WebGL 2.0 (GPU)   │   │   │
│  │                          └────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Module Dependency Graph

```
config.js  (pure data — imported by many)
    │
    ├──→ scene-setup.js       (three)
    ├──→ starfield.js         (three)
    ├──→ sun.js               (three)
    ├──→ asteroid-belt.js     (three)
    ├──→ camera-controller.js (three)
    └──→ render-loop.js       (three)

planets.js          (three — receives planetDefs from caller)
interactions.js     (three — receives planets from caller)
ui-controls.js      (three — receives refs from caller)

    └──→ main.js    (orchestrator: imports ALL modules, owns shared state)
             │
             └──→ index.html (thin shell: HTML + CSS + <script src=...>)
```

**No circular dependencies.** The graph is a strict DAG. `config.js` has zero imports. `main.js` is the only module that imports from everything else. Shared state is owned by `main.js` and passed down via ref objects — modules never import each other horizontally.

## Module Responsibilities

| Module | Concern | Key Export |
|--------|---------|------------|
| `config.js` | All tunable constants, planet definitions | `planetDefs`, `SUN_RADIUS`, `GLOW_LAYERS`, etc. |
| `scene-setup.js` | Scene, renderer, camera, controls, resize | `createScene()` |
| `starfield.js` | 4,000-point star background | `createStarfield(scene)` |
| `sun.js` | Procedural texture, surface shader, 5 glow shells, corona rays, flare particles | `createSun(scene)` |
| `planets.js` | 8 planets with orbital pivots, rings, orbit lines | `createPlanets(scene, defs)` |
| `asteroid-belt.js` | 1,800-point ring between Mars & Jupiter | `createAsteroidBelt(scene)` |
| `interactions.js` | Raycaster: hover tooltip + click-to-focus | `setupInteractions({...})` |
| `camera-controller.js` | Smooth animations, planet follow, orbit cam | `createCameraController({...})` |
| `ui-controls.js` | Speed/camera button event listeners | `setupUIControls({...})` |
| `render-loop.js` | requestAnimationFrame, per-frame updates | `startRenderLoop({...})` |
| `main.js` | Wiring, state ownership, boot sequence | (default — side effects) |

## Component Tree (Scene Graph)

```
Scene
├── AmbientLight                  # Faint fill so planet shadow sides aren't black
├── Stars (Points)                # 4,000-point particle system, spherical shell
├── SunGroup (Group)
│   ├── SunMesh                   # Sphere with custom ShaderMaterial (convection)
│   ├── PointLight ×2             # Primary warm + secondary orange fill
│   ├── GlowShell ×5              # Nested Fresnel spheres (additive blending)
│   ├── CoronaGroup (Group)       # Rotating parent for corona rays
│   │   └── Sprite ×60            # Individual light-spike sprites
│   └── FlareGroup (Group)        # Parent for floating ember particles
│       └── Mesh ×120             # Tiny shared-geometry spheres
├── Planet Pivots (Object3D ×8)   # Rotate around Y to drive orbital motion
│   └── PlanetGroup (Group ×8)    # Positioned at orbital distance on X
│       ├── PlanetMesh             # Sphere with StandardMaterial
│       └── RingMesh ×2           # (Saturn only) Torus rings
├── OrbitLines (Line ×8)          # Circular line loops
└── AsteroidBelt (Points)         # 1,800 points between Mars and Jupiter
```

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ planetDefs  │────▶│ createPlanets()   │────▶│ Scene Graph     │
│ (config.js) │     │ (planets.js)     │     │ (planets array) │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
┌─────────────┐     ┌──────────────────┐              │
│ User Input  │────▶│ setupInteractions│              │
│ (mouse,kbd) │     │ (interactions.js)│              │
└─────────────┘     └────────┬─────────┘              │
                              │                        │
                     ┌────────▼─────────┐              │
                     │ Shared State      │              │
                     │ (refs in main.js) │              │
                     │  focusedPlanetRef │              │
                     │  speedMultiplierRef              │
                     │  cameraAnim.state│              │
                     └────────┬─────────┘              │
                              │                        │
                     ┌────────▼─────────┐              │
                     │  startRenderLoop │◀─────────────┘
                     │  (render-loop.js)│
                     │  ├─ Update Sun uniforms          │
                     │  ├─ Rotate pivots (orbits)       │
                     │  ├─ Animate corona/flares        │
                     │  ├─ cameraController.update()    │
                     │  └─ renderer.render()            │
                     └──────────────────┘
```

## State Management

All mutable state is owned by `main.js` and wrapped in **ref objects** (`{current: value}`). This lets child modules read/write state without importing `main.js` — avoiding circular dependencies.

| Ref | Type | Written by | Read by |
|-----|------|-----------|---------|
| `focusedPlanetRef` | `{current: null\|object}` | `interactions.js`, `ui-controls.js` | `render-loop.js`, `camera-controller.js` |
| `speedMultiplierRef` | `{current: number}` | `ui-controls.js` | `render-loop.js` |
| `cameraController.animState` | `{current: null\|object}` | `camera-controller.js`, `ui-controls.js` | `camera-controller.js`, `render-loop.js` |

## Shader Architecture

### Sun Surface Shader (`sunSurfaceMat` — `sun.js`)

- **Vertex shader**: displaces vertices along normals using layered 3D hash noise. `uTime` drives `noise3D` to animate convection cells.
- **Fragment shader**: samples the procedural canvas texture, applies a brightness pulse (sinusoidal), limb darkening (N·V falloff), and an emissive color boost.

### Glow Shell Shader (5 instances via `createGlowShell` — `sun.js`)

- **Vertex shader**: passes world-space normal and position to the fragment stage.
- **Fragment shader**: computes the inverse-Fresnel effect (`1 - |N·V|`) raised to a configurable power, multiplied by base alpha and a subtle time-based pulse. Uses **additive blending** so overlapping shells accumulate brightness.

### Key WebGL/Three.js Concepts Used

| Concept | Where |
|---------|-------|
| **Additive blending** | Glow shells, corona sprites, flare particles, starfield |
| **Fresnel effect** | All glow shells (edge-bright, center-transparent) |
| **Depth write disable** | All transparent/glow objects (correct alpha sorting) |
| **Procedural texture** | Sun surface generated on `<canvas>`, uploaded as `CanvasTexture` |
| **Vertex displacement** | Sun convection via noise in the vertex shader |
| **Sprite billboarding** | Corona rays as `THREE.Sprite` (always face camera) |
| **Object3D parenting** | Planet pivots → planet groups; corona group → sprites |
| **Raycasting** | Mouse→planet intersection for click-to-focus |
| **Ref pattern** | Shared mutable state without circular imports |

## Performance Considerations

- **Shared geometry** — flare particles share one `SphereGeometry(0.03, 4, 4)`, saving memory and GPU state changes.
- **No shadow casting on Sun** — the Sun mesh has `castShadow = false`. Shadow maps are expensive (N lights × M casters).
- **Additive blending** — all transparent objects use additive blending with depth-write disabled, avoiding multi-pass overhead and z-fighting.
- **Delta-time capping** — `Math.min(dt, 0.1)` prevents simulation jumps when the tab loses focus.
- **Pixel ratio cap** — `Math.min(devicePixelRatio, 2)` avoids 3×/4× rendering on high-DPI mobile screens.
- **Orbital pivots** — planet orbits use `Object3D.rotation.y` instead of per-frame `sin/cos`, which is a single matrix multiply on the GPU.
- **Single Points draw call** — 4,000 stars and 1,800 asteroids each render in one GPU call, not 5,800 individual meshes.
