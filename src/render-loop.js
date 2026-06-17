/**
 * @fileoverview Main render loop — runs every frame via requestAnimationFrame.
 *
 * Responsibilities each frame:
 *   1. Compute safe delta-time (capped to prevent jumps on tab-refocus)
 *   2. Animate Sun sub-systems (surface, glow, corona, flares)
 *   3. Advance planet orbits (rotate pivots)
 *   4. Delegate camera logic to cameraController
 *   5. Call renderer.render()
 *
 * This module intentionally owns no state — it reads shared refs and
 * calls update functions passed in from main.js.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { BASE_SPEED, MAX_DELTA_TIME } from './config.js';

/**
 * Boots the animation loop. Does not return — runs forever.
 *
 * @param {object} ctx — All references needed per frame
 * @param {THREE.Scene} ctx.scene
 * @param {THREE.WebGLRenderer} ctx.renderer
 * @param {THREE.PerspectiveCamera} ctx.camera
 * @param {THREE.OrbitControls} ctx.controls
 * @param {THREE.Mesh} ctx.sunSurfaceMesh
 * @param {THREE.ShaderMaterial} ctx.sunSurfaceMaterial
 * @param {THREE.ShaderMaterial[]} ctx.glowMaterials
 * @param {{group: THREE.Group, sprites: THREE.Sprite[]}} ctx.corona
 * @param {{group: THREE.Group, particles: THREE.Mesh[]}} ctx.flares
 * @param {Array<{def:object, pivot:THREE.Object3D, mesh:THREE.Mesh}>} ctx.planets
 * @param {{current: number}} ctx.speedMultiplierRef
 * @param {{current: boolean}} ctx.pausedRef
 * @param {{current: null|object}} ctx.focusedPlanetRef
 * @param {object} ctx.cameraController
 */
export function startRenderLoop({
  scene,
  renderer,
  camera,
  controls,
  sunSurfaceMesh,
  sunSurfaceMaterial,
  glowMaterials,
  corona,
  flares,
  planets,
  speedMultiplierRef,
  pausedRef,
  focusedPlanetRef,
  cameraController,
}) {
  const clock = new THREE.Clock();

  /**
   * The animation callback. `timestamp` is a DOMHighResTimeStamp (ms).
   * Scheduled via requestAnimationFrame before the next vsync.
   *
   * @param {number} timestamp
   */
  function animate(timestamp) {
    requestAnimationFrame(animate);

    // ── Delta time with safety cap ──────────────────────────────────
    // When paused, consume the delta but don't apply it — this prevents
    // a huge time jump when the user unpauses after tabbing away.
    const rawDt = clock.getDelta();
    const dt = pausedRef.current ? 0 : Math.min(rawDt, MAX_DELTA_TIME);
    const elapsed = timestamp * 0.001;  // ms → seconds

    // ── Sun: surface rotation + convection shader time ──────────────
    sunSurfaceMesh.rotation.y += dt * 0.25;
    sunSurfaceMaterial.uniforms.uTime.value = elapsed;

    // Glow shells: update time uniform for pulsation
    glowMaterials.forEach(m => { m.uniforms.uTime.value = elapsed; });

    // Corona rays: independent flicker per sprite
    corona.sprites.forEach((sprite) => {
      const ud = sprite.userData;
      const flicker = 0.5 + 0.5 * Math.sin(elapsed * ud.speed + ud.phase);
      sprite.material.opacity = ud.baseOpacity * flicker;
      const scaleVar = 0.85 + 0.15 * Math.sin(elapsed * ud.speed * 1.3 + ud.phase);
      sprite.scale.y = ud.baseScaleY * scaleVar * flicker;
    });

    // Flare particles: opacity cycle + radial oscillation
    flares.particles.forEach((particle) => {
      const ud = particle.userData;
      const life = 0.5 + 0.5 * Math.sin(elapsed * ud.lifeSpeed + ud.lifePhase);
      particle.material.opacity = life * ud.maxOpacity;
      const r = ud.baseRadius + Math.sin(elapsed * ud.speed + ud.phase) * 0.6;
      particle.position.set(
        Math.sin(ud.phi) * Math.cos(ud.theta) * r,
        Math.sin(ud.phi) * Math.sin(ud.theta) * r,
        Math.cos(ud.phi) * r
      );
    });

    // Corona group slowly drifts
    corona.group.rotation.y += dt * 0.08;
    corona.group.rotation.x += dt * 0.03;

    // ── Planets: orbital motion via pivot rotation ──────────────────
    planets.forEach((p) => {
      p.pivot.rotation.y += dt * p.def.speed * BASE_SPEED * speedMultiplierRef.current;
      p.mesh.rotation.y += dt * 0.5;  // axial rotation
    });

    // ── Camera logic ────────────────────────────────────────────────
    const orbitCamActive = document
      .getElementById('btn-orbit-cam')
      .classList.contains('active');

    cameraController.update(
      dt, elapsed, timestamp,
      focusedPlanetRef.current,
      orbitCamActive
    );

    // ── Finalize ────────────────────────────────────────────────────
    controls.update();
    renderer.render(scene, camera);
  }

  // Kick off the first frame
  requestAnimationFrame(animate);

  console.log('☀️  Solar System simulation ready.');
  console.log('   Drag to orbit  |  Scroll to zoom  |  Click a planet to focus');
}
