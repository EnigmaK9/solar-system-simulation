/**
 * @fileoverview Asteroid belt particle system.
 *
 * A ring of 1,800 points between Mars and Jupiter rendered as a single
 * THREE.Points draw call. Uses additive blending for a subtle dusty glow.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { ASTEROID_COUNT, ASTEROID_INNER_RADIUS, ASTEROID_OUTER_RADIUS } from './config.js';

/**
 * Creates the asteroid belt and adds it to the scene.
 *
 * @param {THREE.Scene} scene
 */
export function createAsteroidBelt(scene) {
  const beltGeo = new THREE.BufferGeometry();
  const beltPositions = new Float32Array(ASTEROID_COUNT * 3);

  for (let i = 0; i < ASTEROID_COUNT; i++) {
    const angle  = Math.random() * Math.PI * 2;
    const radius = ASTEROID_INNER_RADIUS + Math.random() * (ASTEROID_OUTER_RADIUS - ASTEROID_INNER_RADIUS);
    // Slight vertical scatter gives the belt thickness
    const y = (Math.random() - 0.5) * 0.5;

    beltPositions[i * 3]     = Math.cos(angle) * radius;
    beltPositions[i * 3 + 1] = y;
    beltPositions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPositions, 3));

  const beltMat = new THREE.PointsMaterial({
    color: 0x887766,
    size: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.6,
  });

  const asteroidBelt = new THREE.Points(beltGeo, beltMat);
  scene.add(asteroidBelt);
}
