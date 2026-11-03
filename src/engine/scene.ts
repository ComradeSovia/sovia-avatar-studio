import type { Character } from "@/features/characters/document";
import type { Part } from "@/features/characters/resources";
import { clamp, type Pose } from "./deformation";
export type PartImages = Map<string, HTMLImageElement>;
export interface PaintedFrame {
  part: Part;
  weight: number;
}
/** Draw the lower keyframe completely, then dissolve the upper one over it. */
export function expressionFrames(
  parts: Part[],
  channel: Part["channel"],
  pose: Pose,
): PaintedFrame[] {
  const frame = (state: Part["state"]) =>
    parts.find(
      (p) => p.channel === channel && p.role === "expression" && p.state === state && p.visible,
    );
  const result: PaintedFrame[] = [];
  const add = (part: Part | undefined, weight: number) => {
    if (part && weight > 0) result.push({ part, weight: clamp(weight) });
  };
  if (channel === "mouth") {
    const amount = clamp(pose.mouth),
      shape = pose.mouthShape ?? "open",
      open = frame(shape) ?? frame("open"),
      half = shape === "open" ? frame("half") : undefined;
    if (half && amount < 0.5) add(half, amount * 2);
    else if (half) {
      add(half, 1);
      add(open, (amount - 0.5) * 2);
    } else add(open, Math.min(1, amount * 4));
  } else {
    const amount = clamp(pose.eyes),
      closed = frame("closed"),
      half = frame("half"),
      smile = pose.mood === "smile" ? frame("smile") : undefined;
    if (amount < 0.5) {
      add(closed ?? half, 1);
      if (closed) add(half, amount * 2);
    } else if (smile) {
      add(half ?? closed, 1);
      add(smile, (amount - 0.5) * 2);
    } else if (half) add(half, (1 - amount) * 2);
    else add(closed, 1 - amount);
  }
  return result;
}
export function paintResourceScene(
  ctx: CanvasRenderingContext2D,
  original: HTMLImageElement,
  doc: Character,
  images: PartImages,
  pose: Pose,
) {
  const parts = doc.resources?.parts ?? [],
    width = ctx.canvas.width,
    height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  const foundation = parts.find(
    (p) => p.role === "base" && p.visible && images.has(p.image.sha256),
  );
  const paint = (part: Part, weight = 1) => {
    const image = images.get(part.image.sha256);
    if (!image || !part.visible) return;
    const r = part.region;
    ctx.save();
    ctx.globalAlpha = part.opacity * weight;
    ctx.drawImage(image, r.x * width, r.y * height, r.width * width, r.height * height);
    ctx.restore();
  };
  if (foundation && foundation.opacity === 1) paint(foundation);
  else {
    ctx.drawImage(original, 0, 0, width, height);
    if (foundation) paint(foundation);
  }
  if (foundation)
    for (const part of parts) if (!["base", "mask", "expression"].includes(part.role)) paint(part);
  const handled = { "left-eye": false, "right-eye": false, mouth: false };
  for (const channel of ["left-eye", "right-eye", "mouth"] as const) {
    const bound = parts.filter((p) => p.channel === channel && p.role !== "mask");
    handled[channel] =
      bound.some((p) => p.role === "expression") || (!!foundation && bound.length > 0);
    for (const { part, weight } of expressionFrames(parts, channel, pose)) paint(part, weight);
  }
  return handled;
}
