/**
 * Pure decode of a quantised `bin_u16` point buffer into render-ready geometry.
 *
 * Steps: dequantise u16 → world units, recentre on the centroid, and estimate a
 * real per-point surface **normal** from the local neighbourhood (PCA plane fit,
 * accelerated with a uniform grid). Real normals — unlike the old radial
 * approximation — let the lighting reveal facial features (nose, brow, eye
 * sockets), since those surfaces tilt away from the radial direction. Normals are
 * oriented outward from the centroid for a consistent sign.
 * See obsidian/frontend/utils.md → particles.
 */

import type { PointCloudManifest } from "@/types/particles";

const U16_MAX = 65535;

export interface DecodedPointCloud {
  /** Interleaved xyz positions, recentred so the centroid is the origin. */
  positions: Float32Array;
  /** Interleaved xyz unit surface normals (PCA plane-fit, outward-oriented). */
  normals: Float32Array;
  /** Number of points. */
  count: number;
  /** Distance from centre to the farthest point — frames the camera. */
  radius: number;
  /** Largest |x| — the head's half-width. Lets a narrow (portrait) frame be
   *  fitted to the head's *width* instead of cropping its sides. */
  halfWidth: number;
}

/** Unit eigenvector of the smallest eigenvalue of a symmetric 3×3 matrix. */
const smallestEigenvector = (
  a00: number, a11: number, a22: number,
  a01: number, a02: number, a12: number,
): [number, number, number] => {
  const p1 = a01 * a01 + a02 * a02 + a12 * a12;
  if (p1 === 0) {
    if (a00 <= a11 && a00 <= a22) return [1, 0, 0];
    if (a11 <= a22) return [0, 1, 0];
    return [0, 0, 1];
  }
  const q = (a00 + a11 + a22) / 3;
  const p2 = (a00 - q) ** 2 + (a11 - q) ** 2 + (a22 - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6) || 1e-12;
  const b00 = (a00 - q) / p;
  const b11 = (a11 - q) / p;
  const b22 = (a22 - q) / p;
  const b01 = a01 / p;
  const b02 = a02 / p;
  const b12 = a12 / p;
  const detB =
    b00 * (b11 * b22 - b12 * b12) -
    b01 * (b01 * b22 - b12 * b02) +
    b02 * (b01 * b12 - b11 * b02);
  const r = Math.max(-1, Math.min(1, detB / 2));
  const phi = Math.acos(r) / 3;
  const eig3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3); // smallest eigenvalue

  // Eigenvector = a vector in the null space of (A - eig3·I): cross two rows.
  const m00 = a00 - eig3;
  const m11 = a11 - eig3;
  const m22 = a22 - eig3;
  // rows r0=(m00,a01,a02) r1=(a01,m11,a12) r2=(a02,a12,m22)
  const c0x = a01 * a12 - a02 * m11;
  const c0y = a02 * a01 - m00 * a12;
  const c0z = m00 * m11 - a01 * a01;
  const c1x = a01 * m22 - a02 * a12;
  const c1y = a02 * a02 - m00 * m22;
  const c1z = m00 * a12 - a01 * a02;
  const c2x = m11 * m22 - a12 * a12;
  const c2y = a12 * a02 - a01 * m22;
  const c2z = a01 * a12 - m11 * a02;
  const l0 = c0x * c0x + c0y * c0y + c0z * c0z;
  const l1 = c1x * c1x + c1y * c1y + c1z * c1z;
  const l2 = c2x * c2x + c2y * c2y + c2z * c2z;
  if (l0 >= l1 && l0 >= l2) {
    const l = Math.sqrt(l0) || 1;
    return [c0x / l, c0y / l, c0z / l];
  }
  if (l1 >= l2) {
    const l = Math.sqrt(l1) || 1;
    return [c1x / l, c1y / l, c1z / l];
  }
  const l = Math.sqrt(l2) || 1;
  return [c2x / l, c2y / l, c2z / l];
};

/** Estimate outward surface normals via grid-accelerated PCA plane fitting. */
const computeNormals = (
  positions: Float32Array,
  count: number,
  radius: number,
): Float32Array => {
  const normals = new Float32Array(count * 3);

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const x = positions[o], y = positions[o + 1], z = positions[o + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const cell = Math.max(1e-4, (radius * 2) / Math.cbrt(count / 3)); // ~3 pts/cell
  const gx = Math.max(1, Math.floor((maxX - minX) / cell) + 1);
  const gy = Math.max(1, Math.floor((maxY - minY) / cell) + 1);
  const gz = Math.max(1, Math.floor((maxZ - minZ) / cell) + 1);
  const cellCount = gx * gy * gz;
  const clampCell = (v: number, mn: number, g: number): number =>
    Math.min(g - 1, Math.max(0, Math.floor((v - mn) / cell)));

  // Bucket points into cells with a counting sort (flat arrays, fast).
  const counts = new Int32Array(cellCount + 1);
  const pointCell = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const c =
      (clampCell(positions[o], minX, gx) * gy +
        clampCell(positions[o + 1], minY, gy)) * gz +
      clampCell(positions[o + 2], minZ, gz);
    pointCell[i] = c;
    counts[c + 1]++;
  }
  for (let c = 0; c < cellCount; c++) counts[c + 1] += counts[c];
  const order = new Int32Array(count);
  const cursor = counts.slice(0, cellCount);
  for (let i = 0; i < count; i++) order[cursor[pointCell[i]]++] = i;

  const baseR2 = (cell * 1.6) ** 2;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const px = positions[o], py = positions[o + 1], pz = positions[o + 2];
    const ix = clampCell(px, minX, gx);
    const iy = clampCell(py, minY, gy);
    const iz = clampCell(pz, minZ, gz);

    let n = 0;
    let sx = 0, sy = 0, sz = 0;
    let sxx = 0, syy = 0, szz = 0, sxy = 0, sxz = 0, syz = 0;
    // Expand the search span until enough neighbours are found.
    for (let attempt = 0; attempt < 3; attempt++) {
      n = 0; sx = sy = sz = 0; sxx = syy = szz = sxy = sxz = syz = 0;
      const rr = baseR2 * (attempt + 1) * (attempt + 1);
      const span = attempt + 1;
      for (let dx = -span; dx <= span; dx++) {
        const jx = ix + dx;
        if (jx < 0 || jx >= gx) continue;
        for (let dy = -span; dy <= span; dy++) {
          const jy = iy + dy;
          if (jy < 0 || jy >= gy) continue;
          for (let dz = -span; dz <= span; dz++) {
            const jz = iz + dz;
            if (jz < 0 || jz >= gz) continue;
            const c = (jx * gy + jy) * gz + jz;
            for (let k = counts[c]; k < counts[c + 1]; k++) {
              const jo = order[k] * 3;
              const X = positions[jo], Y = positions[jo + 1], Z = positions[jo + 2];
              const ddx = X - px, ddy = Y - py, ddz = Z - pz;
              if (ddx * ddx + ddy * ddy + ddz * ddz > rr) continue;
              n++;
              sx += X; sy += Y; sz += Z;
              sxx += X * X; syy += Y * Y; szz += Z * Z;
              sxy += X * Y; sxz += X * Z; syz += Y * Z;
            }
          }
        }
      }
      if (n >= 6) break;
    }

    let nx: number, ny: number, nz: number;
    if (n < 4) {
      const len = Math.hypot(px, py, pz) || 1; // fallback: radial
      nx = px / len; ny = py / len; nz = pz / len;
    } else {
      const inv = 1 / n;
      const mx = sx * inv, my = sy * inv, mz = sz * inv;
      [nx, ny, nz] = smallestEigenvector(
        sxx * inv - mx * mx,
        syy * inv - my * my,
        szz * inv - mz * mz,
        sxy * inv - mx * my,
        sxz * inv - mx * mz,
        syz * inv - my * mz,
      );
    }
    // Orient outward from the centroid (origin, since positions are centred).
    if (nx * px + ny * py + nz * pz < 0) {
      nx = -nx; ny = -ny; nz = -nz;
    }
    normals[o] = nx; normals[o + 1] = ny; normals[o + 2] = nz;
  }

  return normals;
};

export const decodePointCloud = (
  manifest: PointCloudManifest,
  buffer: ArrayBuffer,
): DecodedPointCloud => {
  const object = manifest.objects[0];
  if (!object) throw new Error("point-cloud manifest has no objects");
  if (object.format !== "bin_u16")
    throw new Error(`unsupported point format: ${object.format}`);

  const { count, decode_offset, decode_scale } = object;
  const expectedBytes = count * 3 * Uint16Array.BYTES_PER_ELEMENT;
  if (buffer.byteLength < expectedBytes)
    throw new Error(
      `point buffer too small: expected ${expectedBytes} bytes, got ${buffer.byteLength}`,
    );

  const raw = new Uint16Array(buffer, 0, count * 3);
  const positions = new Float32Array(count * 3);

  // First pass: dequantise and accumulate the centroid.
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const x = (raw[o] / U16_MAX) * decode_scale[0] + decode_offset[0];
    const y = (raw[o + 1] / U16_MAX) * decode_scale[1] + decode_offset[1];
    const z = (raw[o + 2] / U16_MAX) * decode_scale[2] + decode_offset[2];
    positions[o] = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    cx += x; cy += y; cz += z;
  }
  cx /= count; cy /= count; cz /= count;

  // Second pass: recentre and track the bounding radius + half-width.
  let radius = 0;
  let halfWidth = 0;
  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const x = positions[o] - cx;
    const y = positions[o + 1] - cy;
    const z = positions[o + 2] - cz;
    positions[o] = x;
    positions[o + 1] = y;
    positions[o + 2] = z;
    const len = Math.hypot(x, y, z);
    if (len > radius) radius = len;
    const ax = Math.abs(x);
    if (ax > halfWidth) halfWidth = ax;
  }

  const normals = computeNormals(positions, count, radius);
  return { positions, normals, count, radius, halfWidth };
};
