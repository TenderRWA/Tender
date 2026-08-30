import * as THREE from "three";

/**
 * Turns the authored vertex buffer into a point-cloud geometry.
 *
 * Produces only what never changes — position, an approximated normal and a
 * stable jitter direction. Shading itself happens in the vertex shader, so
 * re-colouring the rig costs a uniform write rather than a rebuild.
 *
 * 📖 Docs: obsidian/workflows/optimize-3d-scene.md
 */

/** Source data is Blender-style Z-up with the face toward −Y. */
const toThreeSpace = (
  x: number,
  y: number,
  z: number,
): [number, number, number] => [x, z, -y];

/** Flattens the vertical component of the approximated normal. */
const NORMAL_Y_BIAS = 0.35;

export interface BuildHeroCloudOptions {
  /** Flat `[x, y, z, …]` buffer in Blender space. */
  verts: number[];
  /**
   * Keep every Nth point. The source buffer is **spatially sorted by X**, so
   * down-sampling must stride — slicing the tail would delete one entire side
   * of the model (optimize-3d-scene §7).
   */
  stride: number;
}

/**
 * The source carries no normals, so each point gets a radial direction from
 * the centroid with its vertical component damped — which reads convincingly
 * on a bust.
 */
export const buildHeroCloud = ({
  verts,
  stride,
}: BuildHeroCloudOptions): THREE.BufferGeometry => {
  const total = Math.floor(verts.length / 3);
  const kept = Math.ceil(total / stride);

  const positions = new Float32Array(kept * 3);
  const normals = new Float32Array(kept * 3);
  const randoms = new Float32Array(kept * 3);

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < total; i += stride) {
    const [x, y, z] = toThreeSpace(
      verts[i * 3],
      verts[i * 3 + 1],
      verts[i * 3 + 2],
    );
    cx += x;
    cy += y;
    cz += z;
  }
  cx /= kept;
  cy /= kept;
  cz /= kept;

  const normal = new THREE.Vector3();

  for (let i = 0, w = 0; i < total; i += stride, w += 1) {
    const [x, y, z] = toThreeSpace(
      verts[i * 3],
      verts[i * 3 + 1],
      verts[i * 3 + 2],
    );
    positions[w * 3] = x;
    positions[w * 3 + 1] = y;
    positions[w * 3 + 2] = z;

    randoms[w * 3] = Math.random() * 2 - 1;
    randoms[w * 3 + 1] = Math.random() * 2 - 1;
    randoms[w * 3 + 2] = Math.random() * 2 - 1;

    normal.set(x - cx, (y - cy) * NORMAL_Y_BIAS, z - cz).normalize();
    normals[w * 3] = normal.x;
    normals[w * 3 + 1] = normal.y;
    normals[w * 3 + 2] = normal.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 3));
  geometry.computeBoundingSphere();
  return geometry;
};
