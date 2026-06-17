/**
 * @fileoverview Planet factory — creates all 8 planets with orbital pivots,
 * mesh instances, Saturn's rings, and visible orbit lines.
 *
 * Orbital motion uses a parent-child transform hierarchy:
 *   Scene → Pivot (rotates) → PlanetGroup (offset at orbital distance)
 *
 * This avoids per-frame trigonometry — rotating the pivot naturally sweeps
 * its children in a circle via matrix multiplication on the GPU.
 *
 * @created   2026-06-16
 * @modified  2026-06-16
 * @author    enigmak9
 */

import * as THREE from 'three';

/**
 * Creates all planets from the provided definitions.
 *
 * @param {THREE.Scene} scene
 * @param {Array<{name:string, color:number, size:number, distance:number, speed:number, roughness:number, metalness:number, rings?:boolean}>} planetDefs
 * @returns {Array<{def:object, pivot:THREE.Object3D, planetGroup:THREE.Group, mesh:THREE.Mesh, orbitLine:THREE.Line}>}
 */
export function createPlanets(scene, planetDefs) {
  /** @type {Array<{def:object, pivot:THREE.Object3D, planetGroup:THREE.Group, mesh:THREE.Mesh, orbitLine:THREE.Line}>} */
  const planets = [];

  planetDefs.forEach((def) => {
    // ── Pivot: empty Object3D at origin. Rotating this orbits the planet. ──
    const pivot = new THREE.Object3D();
    pivot.rotation.y = Math.random() * Math.PI * 2;  // random starting position
    scene.add(pivot);

    // ── PlanetGroup: positioned at orbital distance on X ─────────────────
    const planetGroup = new THREE.Group();
    planetGroup.position.x = def.distance;
    pivot.add(planetGroup);

    // ── Planet mesh (PBR material) ──────────────────────────────────────
    const geometry = new THREE.SphereGeometry(def.size, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Attach metadata for raycaster tooltip and click-to-focus
    mesh.userData = { planetName: def.name, distance: def.distance };
    planetGroup.add(mesh);

    // ── Saturn's rings (only for Saturn) ────────────────────────────────
    if (def.rings) {
      // Primary ring
      const ringGeo = new THREE.TorusGeometry(def.size * 1.45, def.size * 0.22, 32, 96);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xe8d5a0,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.45;  // ~80° tilt
      planetGroup.add(ring);

      // Secondary fainter outer ring
      const ring2Geo = new THREE.TorusGeometry(def.size * 1.65, def.size * 0.12, 24, 80);
      const ring2Mat = new THREE.MeshStandardMaterial({
        color: 0xccc0a0,
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI * 0.42;
      planetGroup.add(ring2);
    }

    // ── Orbit line (circular path indicator) ────────────────────────────
    const orbitPoints = [];
    const orbitRadius = def.distance;
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        0,
        Math.sin(angle) * orbitRadius
      ));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitLine = new THREE.Line(
      orbitGeo,
      new THREE.LineBasicMaterial({
        color: 0x334455,
        transparent: true,
        opacity: 0.35,
        depthTest: true,
      })
    );
    scene.add(orbitLine);

    planets.push({ def, pivot, planetGroup, mesh, orbitLine });
  });

  return planets;
}
