/**
 * Loads a point-cloud manifest + its binary buffer and decodes it once.
 *
 * Data-fetching lives in a hook (never in the presentational leaf) and exposes
 * the canonical `loading` / `error` / `ready` states so the consumer can render
 * matching UI. The manifest URL is passed in (no hardcoded asset paths in the
 * component tree). See obsidian/frontend/component-conventions.md → Data rules.
 */

import { useEffect, useState } from "react";

import type { PointCloudManifest } from "@/types/particles";
import {
  decodePointCloud,
  type DecodedPointCloud,
} from "@/utils/particles/decode-points";

export type PointCloudStatus = "loading" | "ready" | "error";

export interface PointCloudState {
  status: PointCloudStatus;
  data: DecodedPointCloud | null;
  error: Error | null;
}



interface DecodeResponse {
  ok: boolean;
  cloud?: DecodedPointCloud;
  message?: string;
}

/**
 * Decode off the main thread.
 *
 * The PCA normal fit over 50 000 points blocks for seconds on a throttled phone,
 * and it lands exactly while the preloader is counting — so it runs in a Worker,
 * with the buffers transferred rather than copied. If Workers are unavailable (or
 * the Worker fails to construct), it falls back to decoding inline: a stall is
 * still better than no head.
 *
 * `onWorker` hands the instance back so the caller can terminate it on unmount.
 */
const decode = (
  manifest: PointCloudManifest,
  buffer: ArrayBuffer,
  onWorker: (worker: Worker) => void,
): Promise<DecodedPointCloud> => {
  if (typeof Worker === "undefined")
    return Promise.resolve(decodePointCloud(manifest, buffer));

  return new Promise<DecodedPointCloud>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../utils/particles/decode-points.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      resolve(decodePointCloud(manifest, buffer));
      return;
    }
    onWorker(worker);

    worker.addEventListener("message", (event: MessageEvent<DecodeResponse>) => {
      const { ok, cloud, message } = event.data;
      worker.terminate();
      if (ok && cloud) resolve(cloud);
      else reject(new Error(message ?? "failed to decode the point cloud"));
    });
    worker.addEventListener("error", () => {
      worker.terminate();
      // The buffer was transferred away, so there is nothing to retry with.
      reject(new Error("point-cloud decode worker failed"));
    });

    worker.postMessage({ manifest, buffer }, [buffer]);
  });
};

export const usePointCloud = (
  manifest: PointCloudManifest,
  bufferUrl: string,
): PointCloudState => {
  const [state, setState] = useState<PointCloudState>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let worker: Worker | null = null;

    const load = async (): Promise<void> => {
      setState({ status: "loading", data: null, error: null });
      const object = manifest.objects[0];
      if (!object) throw new Error("manifest has no objects");

      const bufferRes = await fetch(bufferUrl, { signal: controller.signal });
      if (!bufferRes.ok)
        throw new Error(`failed to load points (${bufferRes.status})`);
      const buffer = await bufferRes.arrayBuffer();

      if (cancelled) return;
      const data = await decode(manifest, buffer, (w) => {
        worker = w;
      });
      if (cancelled) return;
      setState({ status: "ready", data, error: null });
    };

    load().catch((error: unknown) => {
      if (cancelled || controller.signal.aborted) return;
      setState({
        status: "error",
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });

    return () => {
      cancelled = true;
      controller.abort();
      worker?.terminate();
    };
  }, [manifest, bufferUrl]);

  return state;
};
