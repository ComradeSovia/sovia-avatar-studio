import { PNG } from "pngjs";
import type { Landmarks } from "@/features/characters/document";
export const marks: Landmarks = {
  leftEye: [
    { x: 0.32, y: 0.29 },
    { x: 0.36, y: 0.275 },
    { x: 0.41, y: 0.285 },
    { x: 0.43, y: 0.3 },
    { x: 0.4, y: 0.315 },
    { x: 0.35, y: 0.315 },
  ],
  rightEye: [
    { x: 0.57, y: 0.3 },
    { x: 0.6, y: 0.28 },
    { x: 0.65, y: 0.28 },
    { x: 0.68, y: 0.295 },
    { x: 0.65, y: 0.315 },
    { x: 0.6, y: 0.315 },
  ],
  mouth: { x: 0.5, y: 0.38 },
  chin: { x: 0.5, y: 0.45 },
  neck: { x: 0.5, y: 0.5 },
  crown: { x: 0.5, y: 0.08 },
};
export function fixturePng() {
  const w = 400,
    h = 600,
    png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w,
        v = y / h;
      let color: number[] = [0, 0, 0, 0];
      if (((u - 0.5) / 0.26) ** 2 + ((v - 0.27) / 0.2) ** 2 < 1) color = [139, 112, 94, 255];
      if (((u - 0.5) / 0.21) ** 2 + ((v - 0.29) / 0.16) ** 2 < 1) color = [245, 211, 182, 255];
      if (v > 0.43 && v < 0.52 && u > 0.44 && u < 0.56) color = [245, 211, 182, 255];
      if (((u - 0.5) / 0.27) ** 2 + ((v - 0.8) / 0.33) ** 2 < 1 && v > 0.49)
        color = [112, 155, 132, 255];
      for (const cx of [0.375, 0.625]) {
        if (((u - cx) / 0.055) ** 2 + ((v - 0.3) / 0.018) ** 2 < 1) color = [250, 251, 247, 255];
        if (((u - cx) / 0.017) ** 2 + ((v - 0.3) / 0.018) ** 2 < 1) color = [80, 115, 134, 255];
      }
      if (Math.abs(v - 0.38) < 0.002 && u > 0.47 && u < 0.53) color = [145, 91, 84, 255];
      png.data.set(color, (y * w + x) * 4);
    }
  return PNG.sync.write(png);
}
