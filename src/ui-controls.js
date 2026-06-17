/**
 * @fileoverview UI controls — bottom-bar buttons for pause, speed, camera
 * presets, and orbit-cam toggle. Also registers keyboard shortcuts.
 *
 * All DOM event wiring lives here. State is stored in mutable ref objects
 * passed from main.js so the render loop can read it without importing DOM code.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';

/**
 * Wires up all control buttons + keyboard listeners.
 *
 * @param {object} deps
 * @param {object} deps.focusedPlanetRef     — {current: null|object}
 * @param {object} deps.speedMultiplierRef    — {current: number}
 * @param {object} deps.pausedRef             — {current: boolean}
 * @param {Function} deps.beginAnimation      — (targetPos, targetLook) => void
 */
export function setupUIControls({
  focusedPlanetRef,
  speedMultiplierRef,
  pausedRef,
  beginAnimation,
}) {
  const speedReadout = document.getElementById('speed-readout');
  const btnReset = document.getElementById('btn-reset');
  const btnOrbitCam = document.getElementById('btn-orbit-cam');
  const btnPause = document.getElementById('btn-pause');

  // ── Helpers ──────────────────────────────────────────────────────────

  /** Updates pause button text and styling to reflect current state. */
  function updatePauseUI() {
    if (pausedRef.current) {
      btnPause.innerHTML = '▶&nbsp;Resume';
      btnPause.classList.add('active');
    } else {
      btnPause.innerHTML = '⏸&nbsp;Pause';
      btnPause.classList.remove('active');
    }
  }

  /** Toggles the pause state and refreshes the button. */
  function togglePause() {
    pausedRef.current = !pausedRef.current;
    updatePauseUI();
  }

  /** Updates the speed label and highlights the 1× button when at default. */
  function updateSpeedUI() {
    speedReadout.textContent = `Speed ×${speedMultiplierRef.current.toFixed(1)}`;
    btnReset.classList.toggle('active', speedMultiplierRef.current === 1.0);
  }

  /** Adjusts speed by a delta, clamped to [0.1, 5.0]. */
  function adjustSpeed(delta) {
    speedMultiplierRef.current = Math.min(
      5.0,
      Math.max(0.1, speedMultiplierRef.current + delta)
    );
    updateSpeedUI();
  }

  // ── Button event listeners ───────────────────────────────────────────

  btnPause.addEventListener('click', togglePause);

  document.getElementById('btn-slower').addEventListener('click', () => adjustSpeed(-0.25));
  document.getElementById('btn-faster').addEventListener('click', () => adjustSpeed(+0.25));
  document.getElementById('btn-reset').addEventListener('click', () => {
    speedMultiplierRef.current = 1.0;
    updateSpeedUI();
  });

  document.getElementById('btn-topdown').addEventListener('click', () => {
    focusedPlanetRef.current = null;
    btnOrbitCam.classList.remove('active');
    beginAnimation(
      new THREE.Vector3(0, 45, 2),   // camera position
      new THREE.Vector3(0, 0, 0)     // look-at target
    );
  });

  btnOrbitCam.addEventListener('click', function () {
    this.classList.toggle('active');
    if (!this.classList.contains('active')) {
      focusedPlanetRef.current = null;
    }
  });

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  //
  // We listen on `window` so shortcuts work regardless of focus.
  // Ignore events when the user is typing in an input field (none exist
  // in this app, but it's a defensive practice).

  window.addEventListener('keydown', (e) => {
    // Ignore if a modifier is held (Cmd+S, Ctrl+W, etc. are browser shortcuts)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      // ── Pause / Resume ──────────────────────────────────────────
      case ' ':
        e.preventDefault();  // prevent page scroll on Space
        togglePause();
        break;

      // ── Speed controls ──────────────────────────────────────────
      case '+':
      case '=':             // '=' is the unshifted key for '+'
        e.preventDefault();
        adjustSpeed(+0.25);
        break;

      case '-':
      case '_':
        e.preventDefault();
        adjustSpeed(-0.25);
        break;

      case 'r':
      case 'R':
        // Reset speed to 1×
        speedMultiplierRef.current = 1.0;
        updateSpeedUI();
        break;

      case '0':
        // Jump to 0.1× (near-pause without fully pausing)
        speedMultiplierRef.current = 0.1;
        updateSpeedUI();
        break;

      // ── Camera presets ──────────────────────────────────────────
      case 't':
      case 'T':
        // Top-down view
        focusedPlanetRef.current = null;
        btnOrbitCam.classList.remove('active');
        beginAnimation(
          new THREE.Vector3(0, 45, 2),
          new THREE.Vector3(0, 0, 0)
        );
        break;

      case 'o':
      case 'O':
        // Toggle orbit cam
        btnOrbitCam.classList.toggle('active');
        if (!btnOrbitCam.classList.contains('active')) {
          focusedPlanetRef.current = null;
        }
        break;

      case 'f':
      case 'F':
        // Release focus (free camera)
        focusedPlanetRef.current = null;
        btnOrbitCam.classList.remove('active');
        break;

      default:
        break;
    }
  });

  // ── Initial UI state ─────────────────────────────────────────────────
  updatePauseUI();

  return { updateSpeedUI, updatePauseUI, togglePause };
}
