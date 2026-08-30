/**
 * Web Worker wrapper around `decodePointCloud`.
 *
 * The decode is pure but *expensive*: 50 000 points, each getting a PCA plane fit
 * over its neighbourhood. Measured on an emulated phone (4× CPU throttle) it
 * blocks for close to four seconds — on the main thread that is the preloader
 * freezing mid-count and the whole page ignoring input, which is exactly the
 * class of stall the loader exists to prevent.
 *
 * So it runs here instead. The input buffer is transferred in (the main thread is
 * done with it) and the decoded attribute arrays are transferred back out, so
 * nothing of consequence is copied in either direction.
 *
 * Consumed by `use-point-cloud`, which falls back to decoding inline if Workers
 * are unavailable.
 */

import type { PointCloudManifest } from "@/types/particles";

import { decodePointCloud } from "./decode-points";

export interface DecodeRequest {
  manifest: PointCloudManifest;
  buffer: ArrayBuffer;
}

/** The slice of the worker global this file uses. Declared locally rather than
 *  pulling the `webworker` lib into a DOM tsconfig, where the two disagree. */
interface WorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<DecodeRequest>) => void,
  ): void;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.addEventListener("message", (event: MessageEvent<DecodeRequest>) => {
  try {
    const { manifest, buffer } = event.data;
    const cloud = decodePointCloud(manifest, buffer);
    scope.postMessage({ ok: true, cloud }, [
      cloud.positions.buffer,
      cloud.normals.buffer,
    ]);
  } catch (error) {
    scope.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
