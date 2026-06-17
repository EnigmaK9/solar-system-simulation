/**
 * @fileoverview Application-wide constants and planet configuration.
 *
 * All visual tuning parameters live here so designers can tweak
 * the simulation without reading implementation code.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

// ── Planet definitions ─────────────────────────────────────────────────
//
// These are ARTISTIC values, not astronomically accurate.
// True scale would make inner planets invisible at this orbital spacing.
// Priorities: visual clarity > scientific precision.
//
// Each planet entry:
//   name       - Display name (tooltip, console)
//   color      - Hex for MeshStandardMaterial base color
//   size       - Sphere radius in world units
//   distance   - Orbital radius from the Sun center
//   speed      - Angular orbital speed multiplier (higher = faster)
//   roughness  - PBR roughness  (0 = mirror,  1 = fully matte)
//   metalness  - PBR metalness  (0 = rock/ice, 1 = pure metal)
//   rings      - If true, add Saturn-style torus rings

/** @type {Array<{name:string, color:number, size:number, distance:number, speed:number, roughness:number, metalness:number, rings?:boolean}>} */
export const planetDefs = [
  { name: 'Mercury',  color: 0xb0a6a0, size: 0.38, distance: 4.0,  speed: 4.15, roughness: 0.7,  metalness: 0.1 },
  { name: 'Venus',    color: 0xe8cda0, size: 0.72, distance: 6.5,  speed: 3.0,  roughness: 0.5,  metalness: 0.05 },
  { name: 'Earth',    color: 0x4488cc, size: 0.75, distance: 9.0,  speed: 2.4,  roughness: 0.4,  metalness: 0.05 },
  { name: 'Mars',     color: 0xcc6644, size: 0.53, distance: 11.5, speed: 1.8,  roughness: 0.8,  metalness: 0.1 },
  { name: 'Jupiter',  color: 0xd8c0a0, size: 2.2,  distance: 16.0, speed: 1.05, roughness: 0.45, metalness: 0.02 },
  { name: 'Saturn',   color: 0xe8d5a0, size: 1.8,  distance: 21.0, speed: 0.75, roughness: 0.5,  metalness: 0.03, rings: true },
  { name: 'Uranus',   color: 0x88ccdd, size: 1.3,  distance: 26.5, speed: 0.55, roughness: 0.3,  metalness: 0.05 },
  { name: 'Neptune',  color: 0x3355cc, size: 1.25, distance: 32.0, speed: 0.42, roughness: 0.25, metalness: 0.05 },
];

// ── Orbital mechanics ──────────────────────────────────────────────────

/** Base angular velocity applied every frame. Multiplied by planet speed and user speed control. */
export const BASE_SPEED = 0.4;

// ── Sun ────────────────────────────────────────────────────────────────

/** Radius of the Sun sphere in world units. */
export const SUN_RADIUS = 1.6;

/** Resolution of the procedural Sun surface texture in pixels (square). */
export const SUN_TEXTURE_SIZE = 1024;

/** Number of granulation speckles painted onto the Sun texture. */
export const SUN_GRANULE_COUNT = 6000;

/** Number of sunspot blotches. */
export const SUN_SPOT_COUNT = 12;

/** Number of bright faculae regions. */
export const SUN_FACULA_COUNT = 20;

// ── Glow shells ────────────────────────────────────────────────────────

/**
 * Each glow shell is { radius, color, falloff, alpha, segments }.
 * radius offsets from sun surface; higher falloff = tighter glow;
 * alpha = peak rim opacity.
 */
export const GLOW_LAYERS = [
  { radius: 1.68, color: 0xffffff, falloff: 2.8, alpha: 0.70, segments: 64 },  // white-hot core
  { radius: 1.80, color: 0xffcc22, falloff: 3.5, alpha: 0.55, segments: 56 },  // bright gold
  { radius: 2.05, color: 0xff8811, falloff: 4.8, alpha: 0.35, segments: 52 },  // warm orange
  { radius: 2.45, color: 0xff5511, falloff: 6.5, alpha: 0.20, segments: 48 },  // deep orange-red
  { radius: 3.10, color: 0xcc3300, falloff: 9.0, alpha: 0.09, segments: 40 },  // faint red halo
];

// ── Corona rays ────────────────────────────────────────────────────────

/** Number of sprite-based light spikes on the Sun's surface. */
export const CORONA_COUNT = 60;

/** Radius at which corona ray bases sit (slightly above surface). */
export const CORONA_BASE_RADIUS = 1.62;

// ── Flare particles ────────────────────────────────────────────────────

/** Number of floating ember particles around the Sun. */
export const FLARE_COUNT = 120;

/** Inner radius of the flare particle shell (just above surface). */
export const FLARE_INNER_RADIUS = 1.65;

/** Outer radius of the flare particle shell. */
export const FLARE_OUTER_RADIUS = 2.5;

// ── Starfield ──────────────────────────────────────────────────────────

/** Number of background stars. */
export const STAR_COUNT = 4000;

/** Inner radius of the star sphere. */
export const STAR_INNER_RADIUS = 250;

/** Outer radius of the star sphere. */
export const STAR_OUTER_RADIUS = 400;

// ── Asteroid belt ──────────────────────────────────────────────────────

/** Number of asteroid particles. */
export const ASTEROID_COUNT = 1800;

/** Inner edge of the belt (between Mars at 11.5 and Jupiter at 16.0). */
export const ASTEROID_INNER_RADIUS = 13.0;

/** Outer edge of the belt. */
export const ASTEROID_OUTER_RADIUS = 14.8;

// ── Camera ─────────────────────────────────────────────────────────────

/** Initial camera position (elevated angle, looking at origin). */
export const CAMERA_START = { x: 20, y: 28, z: 42 };

/** Camera field of view in degrees. */
export const CAMERA_FOV = 50;

/** Near clipping plane (objects closer than this are invisible). */
export const CAMERA_NEAR = 0.5;

/** Far clipping plane (objects beyond this are invisible). */
export const CAMERA_FAR = 1200;

/** Minimum zoom distance (prevents going inside the Sun). */
export const CAMERA_MIN_DISTANCE = 4;

/** Maximum zoom distance. */
export const CAMERA_MAX_DISTANCE = 200;

/** Damping factor for OrbitControls inertia (lower = more drift). */
export const CAMERA_DAMPING = 0.08;

// ── Animation ──────────────────────────────────────────────────────────

/** Duration of smooth camera transitions in milliseconds. */
export const CAMERA_ANIM_DURATION = 1200;

/** Maximum delta-time per frame in seconds (prevents jumps on tab refocus). */
export const MAX_DELTA_TIME = 0.1;

// ── Renderer ───────────────────────────────────────────────────────────

/** Cap pixel ratio to avoid 3×/4× rendering on high-DPI phones. */
export const MAX_PIXEL_RATIO = 2;

/** Tone mapping exposure (brightness). */
export const TONEMAP_EXPOSURE = 1.2;
