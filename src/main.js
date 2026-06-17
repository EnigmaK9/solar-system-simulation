/**
 * @fileoverview Application entry point — orchestrates module initialization
 * and wires together the scene graph, interactions, UI, and render loop.
 *
 * Architecture:  main.js is the ONLY module that imports from all others.
 * It owns the shared mutable state (refs) and passes them down so modules
 * never import each other directly (DAG, no cycles).
 *
 * Dependency flow:
 *   config.js           ← pure data, imported by many
 *   scene-setup.js      ← depends on three + config
 *   starfield.js        ← depends on three + config
 *   sun.js              ← depends on three + config
 *   planets.js          ← depends on three
 *   asteroid-belt.js    ← depends on three + config
 *   interactions.js     ← depends on three
 *   camera-controller.js← depends on three + config
 *   ui-controls.js      ← depends on three
 *   render-loop.js      ← depends on three + config
 *   main.js             ← imports all above, owns state, starts loop
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { planetDefs } from './config.js';
import { createScene } from './scene-setup.js';
import { createStarfield } from './starfield.js';
import { createSun } from './sun.js';
import { createPlanets } from './planets.js';
import { createAsteroidBelt } from './asteroid-belt.js';
import { setupInteractions } from './interactions.js';
import { createCameraController } from './camera-controller.js';
import { setupUIControls } from './ui-controls.js';
import { startRenderLoop } from './render-loop.js';

// ══════════════════════════════════════════════════════════════════════════
// 1. Core infrastructure
// ══════════════════════════════════════════════════════════════════════════

const { scene, renderer, camera, controls } = createScene();

// ── Ambient light (faint fill so shadow sides aren't pure black) ──────
scene.add(new THREE.AmbientLight(0x111122, 0.6));

// ══════════════════════════════════════════════════════════════════════════
// 2. Visual elements (order doesn't matter for rendering — GPU depth-sorts)
// ══════════════════════════════════════════════════════════════════════════

createStarfield(scene);

const sun = createSun(scene);

const planets = createPlanets(scene, planetDefs);

createAsteroidBelt(scene);

// ══════════════════════════════════════════════════════════════════════════
// 3. Shared mutable state (owned by main.js, passed as refs)
// ══════════════════════════════════════════════════════════════════════════

/** @type {{current: null|object}} */
const focusedPlanetRef = { current: null };

/** @type {{current: number}} */
const speedMultiplierRef = { current: 1.0 };

/** @type {{current: boolean}} */
const pausedRef = { current: false };

// ══════════════════════════════════════════════════════════════════════════
// 4. Interaction & UI (modify shared state)
// ══════════════════════════════════════════════════════════════════════════

const cameraController = createCameraController({ camera, controls });

// Wire interactions: when a planet is clicked, deactivate orbit-cam button
setupInteractions({
  camera,
  renderer,
  planets,
  focusedPlanetRef,
  onFocusChange: (action) => {
    if (action === 'focus') {
      document.getElementById('btn-orbit-cam').classList.remove('active');
    }
  },
});

setupUIControls({
  focusedPlanetRef,
  speedMultiplierRef,
  pausedRef,
  beginAnimation: cameraController.beginAnimation,
});

// ══════════════════════════════════════════════════════════════════════════
// 5. Start the render loop
// ══════════════════════════════════════════════════════════════════════════

startRenderLoop({
  scene,
  renderer,
  camera,
  controls,
  sunSurfaceMesh: sun.surfaceMesh,
  sunSurfaceMaterial: sun.surfaceMaterial,
  glowMaterials: sun.glowMaterials,
  corona: sun.corona,
  flares: sun.flares,
  planets,
  speedMultiplierRef,
  pausedRef,
  focusedPlanetRef,
  cameraController,
});
