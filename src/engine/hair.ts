import type { Character, Point } from "@/features/characters/document";
import type { PartImages } from "./scene";

interface Mask {
  width: number;
  height: number;
  values: Uint8Array;
}
/** Per-guide damped springs with influence restricted to an explicit image mask. */
export class HairDynamics {
  private springs = new Map<string, { position: number; velocity: number }>();
  private lastTime = 0;
  constructor(private mask: Mask | null) {}
  update(doc: Character, time: number) {
    const guides = doc.resources?.hair?.strands ?? [];
    if (!time) {
      this.springs.clear();
      this.lastTime = 0;
      return;
    }
    const dt = this.lastTime ? Math.max(0, Math.min(0.04, time - this.lastTime)) : 1 / 60;
    this.lastTime = time;
    guides.forEach((guide, i) => {
      const spring = this.springs.get(guide.id) ?? { position: 0, velocity: 0 };
      const target = Math.sin(time * 1.55 + i * 0.71) * 0.55 + Math.sin(time * 2.7 + i) * 0.16;
      const frequency = 5 + guide.stiffness * 7;
      spring.velocity +=
        ((target - spring.position) * frequency - frequency * 0.7 * spring.velocity) * dt;
      spring.position += spring.velocity * dt;
      this.springs.set(guide.id, spring);
    });
  }
  offset(point: Point, doc: Character): Point {
    const hair = doc.resources?.hair,
      mask = this.mask,
      maskPart = doc.resources?.parts.find((p) => p.role === "mask" && p.visible);
    if (!hair || !mask || !maskPart || !hair.strength) return { x: 0, y: 0 };
    const sample =
      (mask.values[
        Math.min(mask.height - 1, Math.floor(point.y * mask.height)) * mask.width +
          Math.min(mask.width - 1, Math.floor(point.x * mask.width))
      ] /
        255) *
      maskPart.opacity;
    if (sample < 0.01) return { x: 0, y: 0 };
    const w = doc.artwork.width,
      h = doc.artwork.height,
      x = point.x * w,
      y = point.y * h;
    let dx = 0,
      dy = 0,
      weightSum = 0;
    for (const strand of hair.strands) {
      const spring = this.springs.get(strand.id);
      if (!spring) continue;
      const nodes = strand.points.map((p) => ({ x: p.x * w, y: p.y * h }));
      const lengths = nodes.slice(1).map((p, i) => Math.hypot(p.x - nodes[i].x, p.y - nodes[i].y)),
        total = lengths.reduce((a, b) => a + b, 0);
      if (total < 1) continue;
      let nearest = Infinity,
        progress = 0,
        along = 0;
      for (let i = 0; i < lengths.length; i++) {
        const a = nodes[i],
          b = nodes[i + 1],
          length = lengths[i];
        if (!length) continue;
        const t = Math.max(
            0,
            Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / (length * length)),
          ),
          distance = Math.hypot(x - a.x - t * (b.x - a.x), y - a.y - t * (b.y - a.y));
        if (distance < nearest) {
          nearest = distance;
          progress = (along + t * length) / total;
        }
        along += length;
      }
      const radius = strand.radius * w;
      if (nearest >= radius) continue;
      const weight = (1 - nearest / radius) ** 2 * progress ** 2,
        last = nodes[nodes.length - 1],
        axis = Math.hypot(last.x - nodes[0].x, last.y - nodes[0].y) || 1,
        amount = spring.position * total * 0.065 * weight;
      dx += (-(last.y - nodes[0].y) / axis) * amount;
      dy += ((last.x - nodes[0].x) / axis) * amount;
      weightSum += weight;
    }
    const scale = (sample * hair.strength) / Math.max(1, weightSum);
    return { x: (dx * scale) / w, y: (dy * scale) / h };
  }
}
export function createHairDynamics(doc: Character, images: PartImages) {
  const maskPart = doc.resources?.parts.find((p) => p.role === "mask" && p.visible),
    image = maskPart && images.get(maskPart.image.sha256);
  if (!image) return new HairDynamics(null);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = Math.max(1, Math.round((256 * doc.artwork.height) / doc.artwork.width));
  const ctx = canvas.getContext("2d");
  if (!ctx) return new HairDynamics(null);
  const r = maskPart.region;
  ctx.drawImage(
    image,
    r.x * canvas.width,
    r.y * canvas.height,
    r.width * canvas.width,
    r.height * canvas.height,
  );
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    values = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < values.length; i++)
    values[i] = Math.round((pixels[i * 4] * pixels[i * 4 + 3]) / 255);
  return new HairDynamics({ width: canvas.width, height: canvas.height, values });
}
