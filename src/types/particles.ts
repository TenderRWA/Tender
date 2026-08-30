/**
 * Shared types for the point-cloud assets consumed by the particle-field hero.
 *
 * The asset ships as a manifest (`public/assets/head/points.manifest.json`)
 * describing one or more quantised binary point buffers. Only the `bin_u16`
 * format is supported today: three little-endian `uint16` per point (x, y, z),
 * dequantised with `value / 65535 * decode_scale + decode_offset`.
 */

/** Currently supported point-buffer encodings. */
export type PointFormat = "bin_u16";

/** A single decoded-once vector-3, used for the per-axis decode transform. */
export type Vec3 = readonly [number, number, number];

/** One object entry inside a point-cloud manifest. */
export interface PointCloudObject {
  /** Human-readable object name (e.g. `"points"`). */
  name: string;
  /** Binary buffer filename, resolved relative to the manifest. */
  file: string;
  /** Encoding of `file`. */
  format: PointFormat;
  /** Number of points in the buffer. */
  count: number;
  /** Axis that points up in the source model (`"Y"` matches WebGL). */
  up_axis: "X" | "Y" | "Z";
  /** Per-axis additive offset applied after scaling the quantised value. */
  decode_offset: Vec3;
  /** Per-axis multiplier applied to the normalised (0..1) quantised value. */
  decode_scale: Vec3;
}

/** Top-level point-cloud manifest. */
export interface PointCloudManifest {
  objects: PointCloudObject[];
}
