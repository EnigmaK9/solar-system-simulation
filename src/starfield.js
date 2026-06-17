/**
 * @fileoverview Background starfield — a spherical shell of points rendered
 * as a single THREE.Points draw call for performance.
 *
 * Uses spherical coordinates with uniform distribution (acos correction)
 * so stars don't cluster at the poles.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { STAR_COUNT, STAR_INNER_RADIUS, STAR_OUTER_RADIUS } from './config.js';

/**
 * Generates a starfield particle system and adds it to the scene.
 *
 * @param {THREE.Scene} scene — The scene to add the stars to.
 */
export function createStarfield(scene) {
  const starsGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors    = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform distribution on a sphere:
    // theta = azimuth (0 → 2π), phi = polar (0 → π)
    // acos(2*rand-1) prevents polar clustering
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);

    // Place in a thick shell so stars have depth
    const r = STAR_INNER_RADIUS + Math.random() * (STAR_OUTER_RADIUS - STAR_INNER_RADIUS);

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Slight blue tint on some stars for variety
    const tint = 0.7 + Math.random() * 0.3;
    colors[i * 3]     = tint;
    colors[i * 3 + 1] = tint;
    colors[i * 3 + 2] = tint * (0.85 + Math.random() * 0.15);
  }

  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const starsMat = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,                // use per-vertex colors
    blending: THREE.AdditiveBlending,  // overlapping stars get brighter
    depthWrite: false,                 // don't occlude transparent objects
  });

  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);
}
