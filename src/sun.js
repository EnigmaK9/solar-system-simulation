/**
 * @fileoverview Complete Sun system: procedural texture, animated surface
 * with convection shader, five-layer Fresnel glow, corona ray sprites,
 * and floating flare particles.
 *
 * This is the most GPU-intensive object in the scene. The surface uses a
 * custom ShaderMaterial with vertex displacement to simulate boiling plasma.
 * Glow shells use additive blending with inverse-Fresnel alpha for a
 * volumetric corona appearance.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';
import {
  SUN_RADIUS,
  SUN_TEXTURE_SIZE,
  SUN_GRANULE_COUNT,
  SUN_SPOT_COUNT,
  SUN_FACULA_COUNT,
  GLOW_LAYERS,
  CORONA_COUNT,
  CORONA_BASE_RADIUS,
  FLARE_COUNT,
  FLARE_INNER_RADIUS,
  FLARE_OUTER_RADIUS,
} from './config.js';

// ══════════════════════════════════════════════════════════════════════════
//  Internal helpers
// ══════════════════════════════════════════════════════════════════════════

/**
 * Generates a procedural Sun surface texture using the Canvas 2D API.
 *
 * Four painting layers (applied in order):
 *   1. Radial gradient — white-yellow core → orange-red limb
 *   2. Granulation — thousands of tiny random speckles (photosphere cells)
 *   3. Sunspots — dark radial-gradient blotches (cooler surface regions)
 *   4. Faculae — bright patches near sunspots (hotter regions)
 *
 * @param {number} size — Texture width and height in pixels (square)
 * @returns {THREE.CanvasTexture}
 */
function createSunTexture(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Layer 1 — Limb-darkened radial gradient
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.0, '#fffde0');
  gradient.addColorStop(0.25, '#fff9c4');
  gradient.addColorStop(0.45, '#ffcc02');
  gradient.addColorStop(0.65, '#ff9900');
  gradient.addColorStop(0.82, '#ff7700');
  gradient.addColorStop(1.0, '#e05500');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Layer 2 — Granulation speckles
  for (let i = 0; i < SUN_GRANULE_COUNT; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const dx = x - size / 2;
    const dy = y - size / 2;
    const dist = Math.sqrt(dx * dx + dy * dy) / (size / 2);
    if (dist > 0.98) continue;  // keep the circular boundary clean

    const brightness = 0.6 + Math.random() * 0.4;
    const alpha = 0.05 + Math.random() * 0.15 * (1 - dist * 0.7);
    const r = Math.floor(255 * brightness);
    const g = Math.floor(220 * brightness * (0.7 + Math.random() * 0.3));
    const b = Math.floor(80 * brightness * (0.5 + Math.random() * 0.5));

    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + Math.random() * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 3 — Sunspots (dark umbra + lighter penumbra)
  for (let i = 0; i < SUN_SPOT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.1 + Math.random() * 0.55;
    const sx = size / 2 + Math.cos(angle) * (size / 2) * dist;
    const sy = size / 2 + Math.sin(angle) * (size / 2) * dist;
    const spotRadius = 3 + Math.random() * 12;

    const spotGrad = ctx.createRadialGradient(sx, sy, spotRadius * 0.2, sx, sy, spotRadius);
    spotGrad.addColorStop(0.0, 'rgba(120,60,15,0.5)');
    spotGrad.addColorStop(0.5, 'rgba(180,100,30,0.2)');
    spotGrad.addColorStop(1.0, 'rgba(255,180,40,0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, spotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 4 — Faculae (bright regions)
  for (let i = 0; i < SUN_FACULA_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.15 + Math.random() * 0.6;
    const fx = size / 2 + Math.cos(angle) * (size / 2) * dist;
    const fy = size / 2 + Math.sin(angle) * (size / 2) * dist;
    const fRadius = 4 + Math.random() * 10;

    const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fRadius);
    fGrad.addColorStop(0.0, 'rgba(255,255,240,0.35)');
    fGrad.addColorStop(1.0, 'rgba(255,240,200,0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

// ══════════════════════════════════════════════════════════════════════════
//  Sub-component factories
// ══════════════════════════════════════════════════════════════════════════

/**
 * Creates the Sun's opaque surface sphere with a custom ShaderMaterial.
 *
 * Vertex shader: displaces vertices along normals using layered 3D hash
 * noise to create an animated convection (boiling plasma) effect.
 *
 * Fragment shader: samples the procedural texture, applies a brightness
 * pulse, limb darkening (N·V falloff), and an emissive orange boost.
 *
 * @param {THREE.Texture} texture — Procedural canvas texture
 * @returns {{mesh: THREE.Mesh, material: THREE.ShaderMaterial}}
 */
function createSunSurface(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.SphereGeometry(SUN_RADIUS, 96, 96);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uTime:    { value: 0 },
    },

    // GLSL vertex shader — runs once per vertex on the GPU
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPos;
      uniform float uTime;

      // Pseudo-random hash function for noise generation
      float hash(vec3 p) {
        float h = dot(p, vec3(127.1, 311.7, 74.7));
        return fract(sin(h) * 43758.5453);
      }

      // Smooth 3D value noise via trilinear interpolation of 8 corner hashes
      float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);  // Hermite smoothstep
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
        );
      }

      void main() {
        vec3 pos = position;

        // Two noise octaves: low-freq large cells + high-freq detail
        float n  = noise3D(pos * 2.8 + uTime * 0.12);
        float n2 = noise3D(pos * 5.5 + uTime * 0.18) * 0.5;
        pos += normal * (n + n2) * 0.04;  // displace along normal

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vPosition = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,

    // GLSL fragment shader — runs once per pixel on the GPU
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPos;
      uniform sampler2D uTexture;
      uniform float uTime;

      void main() {
        vec4 texColor = texture2D(uTexture, vUv);

        // Organic brightness pulsation (two beating frequencies)
        float pulse = 1.0 + sin(uTime * 2.5) * 0.03 + sin(uTime * 5.7) * 0.02;

        // Limb darkening: edges appear darker (real stellar physics)
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float NdotV = abs(dot(vNormal, viewDir));
        float limb = pow(0.55 + 0.45 * NdotV, 0.6);

        vec3 color = texColor.rgb * pulse * limb;
        color += vec3(1.0, 0.65, 0.08) * 0.25;  // emissive warm boost

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;  // the Sun IS the light source
  return { mesh, material };
}

/**
 * Creates a single glow shell using an inverse-Fresnel shader.
 *
 * The shader makes the sphere transparent at the center and bright at the
 * rim via: alpha = pow(1 - |N·V|, falloff) * baseAlpha.
 *
 * @param {number} radius        — Sphere radius
 * @param {number} colorHex      — Glow color (hex integer)
 * @param {number} falloffPower  — Fresnel exponent (higher = tighter rim)
 * @param {number} baseAlpha     — Peak opacity at the rim
 * @param {number} segments      — Geometry subdivisions
 * @returns {{mesh: THREE.Mesh, material: THREE.ShaderMaterial}}
 */
function createGlowShell(radius, colorHex, falloffPower, baseAlpha, segments) {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:      { value: 0 },
      uColor:     { value: new THREE.Color(colorHex) },
      uBaseAlpha: { value: baseAlpha },
      uFalloff:   { value: falloffPower },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPosition = worldPos.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uBaseAlpha;
      uniform float uFalloff;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFalloff);
        float pulse = 1.0 + sin(uTime * 3.2 + uFalloff) * 0.08;
        gl_FragColor = vec4(uColor, fresnel * uBaseAlpha * pulse);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,  // layers accumulate brightness
    depthWrite: false,                 // don't block objects behind
  });

  return { mesh: new THREE.Mesh(geometry, material), material };
}

/**
 * Creates corona ray sprites distributed uniformly on the Sun's surface.
 *
 * Each sprite is a thin, tapered gradient that always faces the camera.
 * Animation parameters are stored in sprite.userData for the render loop.
 *
 * @returns {{group: THREE.Group, sprites: THREE.Sprite[]}}
 */
function createCoronaRays() {
  const group = new THREE.Group();

  // Generate the ray sprite texture via canvas
  const spriteTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');

    // Vertical brightness gradient: bright base → transparent tip
    const grad = ctx.createLinearGradient(64, 0, 64, 256);
    grad.addColorStop(0.0, 'rgba(255,220,180,0.9)');
    grad.addColorStop(0.08, 'rgba(255,200,100,0.7)');
    grad.addColorStop(0.3, 'rgba(255,140,40,0.25)');
    grad.addColorStop(0.6, 'rgba(255,80,20,0.06)');
    grad.addColorStop(1.0, 'rgba(255,40,10,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    // Horizontal soft-edge mask
    const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
    hGrad.addColorStop(0.0, 'rgba(0,0,0,1)');
    hGrad.addColorStop(0.35, 'rgba(0,0,0,0.3)');
    hGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    hGrad.addColorStop(0.65, 'rgba(0,0,0,0.3)');
    hGrad.addColorStop(1.0, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, 128, 256);

    return new THREE.CanvasTexture(c);
  })();

  /** @type {THREE.Sprite[]} */
  const sprites = [];

  for (let i = 0; i < CORONA_COUNT; i++) {
    const mat = new THREE.SpriteMaterial({
      map: spriteTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
      color: new THREE.Color().setHSL(0.12, 1, 0.5 + Math.random() * 0.5),
    });

    const sprite = new THREE.Sprite(mat);

    // Uniform spherical distribution on the Sun's surface
    const phi   = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    sprite.position.set(
      Math.sin(phi) * Math.cos(theta) * CORONA_BASE_RADIUS,
      Math.sin(phi) * Math.sin(theta) * CORONA_BASE_RADIUS,
      Math.cos(phi) * CORONA_BASE_RADIUS
    );

    const rayHeight = 0.6 + Math.random() * 2.5;
    sprite.scale.set(0.15 + Math.random() * 0.3, rayHeight, 1);

    sprite.userData = {
      baseOpacity: 0.15 + Math.random() * 0.5,
      phase:       Math.random() * Math.PI * 2,
      speed:       0.7 + Math.random() * 2.0,
      baseScaleY:  rayHeight,
    };

    group.add(sprite);
    sprites.push(sprite);
  }

  return { group, sprites };
}

/**
 * Creates floating flare particles — small emissive spheres near the Sun.
 *
 * Uses a single shared geometry for all 120 particles (GPU instancing
 * would be better, but for 120 tiny spheres this is acceptable).
 *
 * @returns {{group: THREE.Group, particles: THREE.Mesh[]}}
 */
function createFlareParticles() {
  const group = new THREE.Group();
  const sharedGeo = new THREE.SphereGeometry(0.03, 4, 4);  // low-poly, shared

  /** @type {THREE.Mesh[]} */
  const particles = [];

  for (let i = 0; i < FLARE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.08 + Math.random() * 0.15, 1, 0.5 + Math.random() * 0.5),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const particle = new THREE.Mesh(sharedGeo, mat);

    const phi    = Math.acos(2 * Math.random() - 1);
    const theta  = Math.random() * Math.PI * 2;
    const radius = FLARE_INNER_RADIUS + Math.random() * FLARE_OUTER_RADIUS;

    particle.position.set(
      Math.sin(phi) * Math.cos(theta) * radius,
      Math.sin(phi) * Math.sin(theta) * radius,
      Math.cos(phi) * radius
    );

    particle.userData = {
      baseRadius: radius,
      phi,
      theta,
      phase:     Math.random() * Math.PI * 2,
      speed:     0.3 + Math.random() * 1.5,
      lifePhase: Math.random() * Math.PI * 2,
      lifeSpeed: 0.4 + Math.random() * 1.2,
      maxOpacity: 0.3 + Math.random() * 0.7,
    };

    group.add(particle);
    particles.push(particle);
  }

  return { group, particles };
}

// ══════════════════════════════════════════════════════════════════════════
//  Public API
// ══════════════════════════════════════════════════════════════════════════

/**
 * Assembles the complete Sun system and adds it to the scene.
 *
 * The returned object contains all the references the render loop needs
 * to animate the Sun's various sub-systems.
 *
 * @param {THREE.Scene} scene
 * @returns {{
 *   group: THREE.Group,
 *   surfaceMesh: THREE.Mesh,
 *   surfaceMaterial: THREE.ShaderMaterial,
 *   glowMaterials: THREE.ShaderMaterial[],
 *   corona: { group: THREE.Group, sprites: THREE.Sprite[] },
 *   flares: { group: THREE.Group, particles: THREE.Mesh[] },
 * }}
 */
export function createSun(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Opaque surface
  const texture = createSunTexture(SUN_TEXTURE_SIZE);
  const { mesh: surfaceMesh, material: surfaceMaterial } = createSunSurface(texture);
  group.add(surfaceMesh);

  // Point lights (the Sun illuminates the planets)
  const light1 = new THREE.PointLight(0xfff8e8, 100, 140, 0.4);
  const light2 = new THREE.PointLight(0xffcc88, 30, 80, 0.6);
  group.add(light1);
  group.add(light2);

  // Glow shells
  /** @type {THREE.ShaderMaterial[]} */
  const glowMaterials = [];
  for (const layer of GLOW_LAYERS) {
    const { mesh, material } = createGlowShell(
      layer.radius, layer.color, layer.falloff, layer.alpha, layer.segments
    );
    group.add(mesh);
    glowMaterials.push(material);
  }

  // Corona rays
  const { group: coronaGroup, sprites: coronaSprites } = createCoronaRays();
  group.add(coronaGroup);

  // Flare particles
  const { group: flareGroup, particles: flareParticles } = createFlareParticles();
  group.add(flareGroup);

  return {
    group,
    surfaceMesh,
    surfaceMaterial,
    glowMaterials,
    corona: { group: coronaGroup, sprites: coronaSprites },
    flares: { group: flareGroup, particles: flareParticles },
  };
}
