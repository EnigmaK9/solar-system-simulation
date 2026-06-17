/**
 * @fileoverview Camera controller — smooth animations between viewpoints,
 * planet-follow behavior, and auto-orbit mode.
 *
 * All camera movement is frame-rate independent (uses lerp toward target
 * rather than fixed-step translation).
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import { CAMERA_ANIM_DURATION } from './config.js';

/**
 * Creates the camera controller.
 *
 * @param {object} opts
 * @param {THREE.Camera} opts.camera
 * @param {THREE.OrbitControls} opts.controls
 * @returns {{
 *   animState: {current: null|object},
 *   beginAnimation: (targetPos: THREE.Vector3, targetLook: THREE.Vector3) => void,
 *   update: (dt: number, elapsed: number, timestamp: number, focusedPlanet: object|null, orbitCamActive: boolean) => void,
 * }}
 */
export function createCameraController({ camera, controls }) {
  /**
   * Mutable animation state reference. When non-null, the camera is
   * mid-transition to a target position/look-at point.
   *
   * @type {{current: null|{startPos:THREE.Vector3, targetPos:THREE.Vector3, startTarget:THREE.Vector3, targetLook:THREE.Vector3, startTime:number, duration:number}}}
   */
  const animState = { current: null };

  /**
   * Begins a smooth ease-in-out camera animation.
   *
   * @param {THREE.Vector3} targetPos  — Desired camera world position
   * @param {THREE.Vector3} targetLook — Desired OrbitControls target
   */
  function beginAnimation(targetPos, targetLook) {
    animState.current = {
      startPos:    camera.position.clone(),
      targetPos:   targetPos.clone(),
      startTarget: controls.target.clone(),
      targetLook:  targetLook.clone(),
      startTime:   performance.now(),
      duration:    CAMERA_ANIM_DURATION,
    };
  }

  /**
   * Called every frame. Handles:
   *   - Planet focus (camera follows planet, optionally orbiting)
   *   - Camera animation (ease-in-out transition)
   *
   * @param {number} dt            — Delta time (seconds)
   * @param {number} elapsed       — Total elapsed time (seconds)
   * @param {number} timestamp     — DOMHighResTimeStamp (milliseconds)
   * @param {object|null} focusedPlanet
   * @param {boolean} orbitCamActive
   */
  function update(dt, elapsed, timestamp, focusedPlanet, orbitCamActive) {
    // ── Planet focus / orbit cam mode ────────────────────────────────
    if (focusedPlanet) {
      const worldPos = new THREE.Vector3();
      focusedPlanet.mesh.getWorldPosition(worldPos);

      if (orbitCamActive) {
        // Orbit camera around the planet in a circle over time
        const camOffset = new THREE.Vector3(
          focusedPlanet.def.size * 4.5,
          focusedPlanet.def.size * 2.5,
          focusedPlanet.def.size * 5.5
        );

        const orbitAngle = elapsed * 0.6;
        const rotatedX = camOffset.x * Math.cos(orbitAngle)
                       - camOffset.z * Math.sin(orbitAngle);
        const rotatedZ = camOffset.x * Math.sin(orbitAngle)
                       + camOffset.z * Math.cos(orbitAngle);

        const targetPos = worldPos.clone().add(
          new THREE.Vector3(rotatedX, camOffset.y, rotatedZ)
        );

        // lerp = exponential ease-out (moves 5-8% of remaining distance per frame)
        camera.position.lerp(targetPos, 0.05);
        controls.target.lerp(worldPos, 0.08);
      } else {
        // Focus mode: slide target to planet, keep camera at current offset
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(worldPos, 0.06);
        camera.position.copy(controls.target.clone().add(offset));
      }
      return;  // animation is suppressed when focused
    }

    // ── Camera animation (e.g., "Top View" button) ───────────────────
    const anim = animState.current;
    if (anim) {
      const t = Math.min((timestamp - anim.startTime) / anim.duration, 1.0);

      // Quadratic ease-in-out: accel → decel
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      camera.position.lerpVectors(anim.startPos, anim.targetPos, ease);
      controls.target.lerpVectors(anim.startTarget, anim.targetLook, ease);

      if (t >= 1.0) animState.current = null;  // done
    }
  }

  return { animState, beginAnimation, update };
}
