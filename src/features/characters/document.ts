import { z } from "zod";
export const FORMAT = "studio.character/v1" as const;
export const pointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
const contourSchema = z.array(pointSchema).min(4).max(40);
export const landmarksSchema = z
  .object({
    leftEye: contourSchema,
    rightEye: contourSchema,
    mouth: pointSchema,
    chin: pointSchema,
    neck: pointSchema,
    crown: pointSchema,
  })
  .superRefine((m, ctx) => {
    const a = centre(m.leftEye),
      b = centre(m.rightEye);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.025)
      ctx.addIssue({
        code: "custom",
        message: "The eyes are too close together. Please mark them again.",
      });
    if (m.chin.y <= m.crown.y || m.neck.y <= m.crown.y)
      ctx.addIssue({ code: "custom", message: "The chin and neck must be below the crown." });
    for (const eye of [m.leftEye, m.rightEye]) {
      const area =
        Math.abs(
          eye.reduce((sum, p, i) => {
            const q = eye[(i + 1) % eye.length];
            return sum + p.x * q.y - q.x * p.y;
          }, 0),
        ) / 2;
      if (area < 0.000025)
        ctx.addIssue({
          code: "custom",
          message: "Eye contours must enclose an area, rather than form a straight line.",
        });
    }
  });
export const motionSchema = z.object({
  yaw: z.number().min(0).max(25),
  pitch: z.number().min(0).max(18),
  blink: z.boolean(),
  breathe: z.boolean(),
});
export const characterSchema = z.object({
  format: z.literal(FORMAT),
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  revision: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  artwork: z.object({
    file: z.literal("portrait.png"),
    width: z.number().int().min(64).max(4096),
    height: z.number().int().min(64).max(4096),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  landmarks: landmarksSchema,
  motion: motionSchema,
});
export type Point = z.infer<typeof pointSchema>;
export type Landmarks = z.infer<typeof landmarksSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Motion = z.infer<typeof motionSchema>;
export type CharacterSummary = Pick<Character, "id" | "name" | "updatedAt" | "revision">;
export const defaults: Motion = { yaw: 14, pitch: 9, blink: true, breathe: true };
export function centre(points: Point[]): Point {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}
export function artworkUrl(id: string) {
  return `/api/characters/${id}/artwork`;
}
