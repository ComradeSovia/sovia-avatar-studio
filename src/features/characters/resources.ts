import { z } from "zod";

export const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 256 * 1024;
export const MAX_RESOURCE_BYTES = 80 * 1024 * 1024;
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const coordinate = z.number().min(0).max(1);
export const regionSchema = z
  .object({
    x: coordinate,
    y: coordinate,
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .refine(
    (r) => r.x + r.width <= 1.000001 && r.y + r.height <= 1.000001,
    "The part must stay within the artwork.",
  );
export const imageAssetSchema = z.object({
  sha256: digestSchema,
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});
export const partSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
    name: z.string().trim().min(1).max(64),
    channel: z.enum(["artwork", "left-eye", "right-eye", "mouth", "hair"]),
    role: z.enum(["base", "iris", "upper-lid", "lower-lid", "crease", "expression", "mask"]),
    state: z.enum(["neutral", "half", "closed", "smile", "open", "wide", "round"]),
    image: imageAssetSchema,
    region: regionSchema,
    visible: z.boolean(),
    opacity: z.number().min(0).max(1),
  })
  .superRefine((p, ctx) => {
    const eye = p.channel === "left-eye" || p.channel === "right-eye";
    const valid =
      p.role === "base"
        ? p.channel === "artwork" && p.state === "neutral"
        : p.role === "mask"
          ? p.channel === "hair" && p.state === "neutral"
          : p.role === "expression"
            ? eye
              ? ["closed", "half", "smile"].includes(p.state)
              : p.channel === "mouth" && ["half", "open", "wide", "round"].includes(p.state)
            : eye && p.state === "neutral";
    if (!valid)
      ctx.addIssue({ code: "custom", message: "The part role, channel, and state do not agree." });
  });
export const strandSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,47}$/),
  name: z.string().min(1).max(64),
  points: z
    .array(z.object({ x: coordinate, y: coordinate }))
    .min(2)
    .max(12),
  radius: z.number().min(0.005).max(0.3),
  stiffness: z.number().min(0.1).max(1),
});
export const resourcesSchema = z
  .object({
    version: z.literal(1),
    parts: z.array(partSchema).max(64),
    hair: z
      .object({ strength: z.number().min(0).max(1), strands: z.array(strandSchema).max(32) })
      .optional(),
  })
  .superRefine((r, ctx) => {
    if (new Set(r.parts.map((p) => p.id)).size !== r.parts.length)
      ctx.addIssue({ code: "custom", message: "Part IDs must be unique." });
    if (r.parts.filter((p) => p.role === "base").length > 1)
      ctx.addIssue({ code: "custom", message: "Only one foundation layer is allowed." });
    const frames = r.parts
      .filter((p) => p.role === "expression")
      .map((p) => `${p.channel}:${p.state}`);
    if (new Set(frames).size !== frames.length)
      ctx.addIssue({
        code: "custom",
        message: "Expression frames must be unique within each channel.",
      });
    const assets = new Map<string, z.infer<typeof imageAssetSchema>>();
    for (const p of r.parts) {
      const old = assets.get(p.image.sha256);
      if (old && (old.width !== p.image.width || old.height !== p.image.height))
        ctx.addIssue({
          code: "custom",
          message: "An image checksum cannot have conflicting dimensions.",
        });
      assets.set(p.image.sha256, p.image);
    }
    if ([...assets.values()].reduce((sum, a) => sum + a.width * a.height, 0) > 32_000_000)
      ctx.addIssue({ code: "custom", message: "The resource set exceeds 32 million pixels." });
    if (r.hair && new Set(r.hair.strands.map((s) => s.id)).size !== r.hair.strands.length)
      ctx.addIssue({ code: "custom", message: "Hair strand IDs must be unique." });
  });
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type Part = z.infer<typeof partSchema>;
export type Resources = z.infer<typeof resourcesSchema>;
export type AssetFiles = Record<string, Uint8Array>;
export function resourceImages(resources?: Resources): ImageAsset[] {
  return [...new Map((resources?.parts ?? []).map((p) => [p.image.sha256, p.image])).values()];
}
export function resourcePath(sha256: string) {
  return `assets/${digestSchema.parse(sha256)}.png`;
}
export function resourceUrl(id: string, sha256: string) {
  return `/api/characters/${encodeURIComponent(id)}/assets/${digestSchema.parse(sha256)}`;
}
