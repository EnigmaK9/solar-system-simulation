/**
 * @fileoverview Core Three.js infrastructure: scene, renderer, camera, and
 * OrbitControls. Also handles window resize.
 *
 * This module MUST be called first — all other modules depend on the scene
 * and renderer instances it creates.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
  CAMERA_START,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_DAMPING,
  MAX_PIXEL_RATIO,
  TONEMAP_EXPOSURE,
} from './config.js';

/**
 * Initializes the Three.js rendering pipeline and returns the core objects
 * that every other module needs.
 *
 * @returns {{scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, controls: OrbitControls}}
 */
export function createScene() {
  // ── Scene (the root of the scene graph) ───────────────────────────────
  const scene = new THREE.Scene();

  // ── Renderer (WebGL → <canvas>) ───────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: true,  // MSAA for smooth polygon edges
    alpha: true,      // transparent canvas background (CSS bg shows through)
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Soft shadow mapping
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // HDR → LDR conversion with filmic color curve
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONEMAP_EXPOSURE;

  document.body.appendChild(renderer.domElement);

  // ── Camera (perspective projection) ───────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR
  );
  camera.position.set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);

  // ── OrbitControls (mouse/touch camera manipulation) ──────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = CAMERA_DAMPING;
  controls.minDistance = CAMERA_MIN_DISTANCE;
  controls.maxDistance = CAMERA_MAX_DISTANCE;
  controls.target.set(0, 0, 0);  // orbit around the Sun
  controls.update();

  // ── Resize handler ────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();  // must call after changing aspect
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, renderer, camera, controls };
}
