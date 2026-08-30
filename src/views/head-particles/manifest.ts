import type { PointCloudManifest } from "@/types/particles";
import pointsAsset from "@/assets/head-points.bin.asset.json";

/** Inline manifest for the hero head point cloud (buffer served from the CDN). */
export const HEAD_MANIFEST: PointCloudManifest = {
  objects: [
    {
      name: "points",
      file: "points.bin",
      format: "bin_u16",
      count: 50000,
      up_axis: "Y",
      decode_offset: [-0.5791200995445251, -1.0, -0.4753395617008209],
      decode_scale: [1.1582401990890503, 2.0, 0.9506791234016418],
    },
  ],
};

export const HEAD_POINTS_URL = pointsAsset.url;
