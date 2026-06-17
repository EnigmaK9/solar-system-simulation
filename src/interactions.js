/**
 * @fileoverview Mouse interaction — raycaster-based planet hover (tooltip)
 * and click-to-focus.
 *
 * Uses Three.js Raycaster to project a ray from the camera through the
 * mouse position (in normalized device coordinates) and test for
 * intersections with planet meshes.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';

/**
 * Sets up mouse event listeners for planet hover and click.
 *
 * @param {object} opts
 * @param {THREE.Camera} opts.camera
 * @param {THREE.WebGLRenderer} opts.renderer
 * @param {Array<{mesh: THREE.Mesh}>} opts.planets       — Planet objects (must have .mesh)
 * @param {{current: null|object}} opts.focusedPlanetRef  — Mutable ref to focused planet
 * @param {() => void} [opts.onFocusChange]              — Called when focus changes (for UI sync)
 */
export function setupInteractions({ camera, renderer, planets, focusedPlanetRef, onFocusChange }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();  // normalized device coords (-1 to +1)
  const tooltip = document.getElementById('tooltip');

  /**
   * Converts a DOM mouse event to NDC and tests for planet intersections.
   * Returns the first intersected mesh, or null.
   *
   * @param {MouseEvent} e
   * @returns {THREE.Mesh|null}
   */
  function getIntersection(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersections = raycaster.intersectObjects(
      planets.map(p => p.mesh)
    );
    return intersections.length > 0 ? intersections[0].object : null;
  }

  // ── Hover: show planet name tooltip ───────────────────────────────────
  window.addEventListener('mousemove', (e) => {
    const hit = getIntersection(e);
    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 18) + 'px';
      tooltip.style.top  = (e.clientY - 10) + 'px';
      tooltip.textContent = hit.userData.planetName;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tooltip.style.display = 'none';
      renderer.domElement.style.cursor = 'default';
    }
  });

  // ── Click: focus or release ──────────────────────────────────────────
  window.addEventListener('click', (e) => {
    const hit = getIntersection(e);
    if (hit) {
      const pData = planets.find(p => p.mesh === hit);
      if (pData) {
        focusedPlanetRef.current = pData;
        if (onFocusChange) onFocusChange('focus', pData);
      }
    } else {
      focusedPlanetRef.current = null;
      if (onFocusChange) onFocusChange('release', null);
    }
  });

  return { raycaster, mouse };
}
