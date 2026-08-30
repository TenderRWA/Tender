/**
 * Minimal column-major 4x4 matrix helpers for the particle-field hero.
 *
 * Just enough to build a perspective camera and a rotate-then-translate model
 * matrix without pulling in a matrix library. The plain functions are pure and
 * return a fresh `Float32Array(16)` in the column-major layout WebGL expects.
 *
 * Each also has an **`*Into` variant** that writes into a caller-owned matrix.
 * Same math, no allocation: the render loop builds a model-view every frame, and
 * at 60 fps the pure versions minted ~360 typed arrays a second — a GC stall on a
 * schedule. Use the pure ones for one-off work (the projection, set on resize)
 * and the `*Into` ones on the per-frame path.
 */

export type Mat4 = Float32Array;

export const identity = (): Mat4 => {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
};

/** Right-handed perspective projection. `fovy` in radians. */
export const perspective = (
  fovy: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 => {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
};

/** Reset `out` to the identity, in place. */
export const identityInto = (out: Mat4): Mat4 => {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
};

/**
 * `out = a * b` (apply `b` first, then `a`).
 *
 * `out` must not alias `a` or `b` — it is written while they are still being
 * read.
 */
export const multiplyInto = (out: Mat4, a: Mat4, b: Mat4): Mat4 => {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
};

/** `out = a * b` (apply `b` first, then `a`). */
export const multiply = (a: Mat4, b: Mat4): Mat4 =>
  multiplyInto(new Float32Array(16), a, b);

export const translationInto = (
  out: Mat4,
  x: number,
  y: number,
  z: number,
): Mat4 => {
  identityInto(out);
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
};

export const translation = (x: number, y: number, z: number): Mat4 =>
  translationInto(new Float32Array(16), x, y, z);

export const rotationXInto = (out: Mat4, rad: number): Mat4 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  identityInto(out);
  out[5] = c;
  out[6] = s;
  out[9] = -s;
  out[10] = c;
  return out;
};

export const rotationX = (rad: number): Mat4 =>
  rotationXInto(new Float32Array(16), rad);

export const rotationYInto = (out: Mat4, rad: number): Mat4 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  identityInto(out);
  out[0] = c;
  out[2] = -s;
  out[8] = s;
  out[10] = c;
  return out;
};

export const rotationY = (rad: number): Mat4 =>
  rotationYInto(new Float32Array(16), rad);
