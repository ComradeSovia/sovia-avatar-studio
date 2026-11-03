import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";
import {
  type Character,
  type CharacterSummary,
  characterSchema,
  defaults,
  FORMAT,
  type Landmarks,
} from "@/features/characters/document";
import { DEFAULT_EXAMPLE_ID } from "@/features/characters/example";
import {
  type AssetFiles,
  digestSchema,
  MAX_DOCUMENT_BYTES,
  MAX_RESOURCE_BYTES,
  resourceImages,
  resourcePath,
} from "@/features/characters/resources";
import { getExampleArtwork, getExampleAsset, getExampleDocument } from "./example";
export const ROOT = resolve(
  /* turbopackIgnore: true */ process.env.STUDIO_DATA_DIR ?? "projects/studio-v1",
);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function root() {
  await mkdir(ROOT, { recursive: true });
  if ((await lstat(ROOT)).isSymbolicLink())
    throw new StudioError("The project directory cannot be a symbolic link.", 400);
}
async function directory(id: string) {
  if (!uuid.test(id)) throw new StudioError("Invalid project ID.", 400);
  await root();
  const p = join(ROOT, id);
  try {
    const s = await lstat(p);
    if (!s.isDirectory() || s.isSymbolicLink())
      throw new StudioError("The project directory is unavailable.", 400);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      throw new StudioError("Character not found.", 404);
    throw e;
  }
  return p;
}
async function safeRead(path: string) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile())
    throw new StudioError("The project file is unavailable.", 400);
  return readFile(path);
}
export async function getCharacter(id: string) {
  if (id === DEFAULT_EXAMPLE_ID) return getExampleDocument();
  const p = await directory(id);
  const bytes = await safeRead(join(p, "character.json"));
  if (bytes.length > MAX_DOCUMENT_BYTES)
    throw new StudioError("The character document is too large.", 400);
  const doc = characterSchema.parse(JSON.parse(bytes.toString()));
  if (doc.id !== id) throw new StudioError("Character IDs do not match.", 400);
  return doc;
}
export async function getArtwork(id: string) {
  if (id === DEFAULT_EXAMPLE_ID) return getExampleArtwork();
  return safeRead(join(await directory(id), "portrait.png"));
}
export async function listCharacters(): Promise<CharacterSummary[]> {
  await root();
  const entries = await readdir(ROOT, { withFileTypes: true });
  const result: CharacterSummary[] = [];
  for (const e of entries) {
    if (!uuid.test(e.name) || !e.isDirectory() || e.isSymbolicLink()) continue;
    try {
      const d = await getCharacter(e.name);
      result.push({ id: d.id, name: d.name, updatedAt: d.updatedAt, revision: d.revision });
    } catch {
      /* Corrupt entries do not hide healthy projects. */
    }
  }
  const example = getExampleDocument();
  return [
    {
      id: example.id,
      name: example.name,
      updatedAt: example.updatedAt,
      revision: example.revision,
      readOnly: true,
    },
    ...result
      .filter((item) => item.id !== DEFAULT_EXAMPLE_ID)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  ];
}
export function inspectPng(bytes: Uint8Array, minDimension = 64) {
  if (
    bytes.length > 20 * 1024 * 1024 ||
    bytes.length < 24 ||
    !Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new StudioError("Choose a PNG image smaller than 20 MB.");
  const b = Buffer.from(bytes);
  const width = b.readUInt32BE(16),
    height = b.readUInt32BE(20);
  if (
    width < minDimension ||
    height < minDimension ||
    width > 4096 ||
    height > 4096 ||
    width * height > 8_000_000
  )
    throw new StudioError(
      "Image dimensions must be 64–4096 pixels, with no more than 8 million pixels in total.",
    );
  let png: PNG;
  try {
    png = PNG.sync.read(b);
  } catch {
    throw new StudioError("The PNG image is damaged or uses an unsupported encoding.");
  }
  if (png.width !== width || png.height !== height)
    throw new StudioError("Image dimensions do not match.");
  return {
    file: "portrait.png" as const,
    width,
    height,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function createCharacter(
  name: string,
  landmarks: Landmarks,
  bytes: Uint8Array,
  template?: Character,
  assets: AssetFiles = {},
) {
  const artwork = inspectPng(bytes),
    now = new Date().toISOString(),
    id = randomUUID();
  if (
    template &&
    (template.artwork.sha256 !== artwork.sha256 ||
      template.artwork.width !== artwork.width ||
      template.artwork.height !== artwork.height)
  )
    throw new StudioError("The archive artwork does not match its document.");
  const doc = characterSchema.parse({
    ...template,
    format: FORMAT,
    id,
    name,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    artwork,
    landmarks,
    motion: template?.motion ?? defaults,
  });
  validateAssetFiles(doc, assets);
  await root();
  const p = join(ROOT, id);
  await mkdir(p);
  try {
    await writeFile(join(p, "portrait.png"), bytes, { flag: "wx" });
    if (Object.keys(assets).length) {
      await mkdir(join(p, "assets"));
      for (const [hash, bytes] of Object.entries(assets))
        await writeFile(join(p, resourcePath(hash)), bytes, { flag: "wx" });
    }
    await writeFile(join(p, "character.json"), JSON.stringify(doc, null, 2), { flag: "wx" });
  } catch (e) {
    await rm(p, { recursive: true, force: true });
    throw e;
  }
  return doc;
}
const pending = new Map<string, Promise<unknown>>();
export async function saveCharacter(id: string, input: unknown) {
  if (id === DEFAULT_EXAMPLE_ID)
    throw new StudioError("Create an editable copy before saving the built-in example.", 403);
  const previous = pending.get(id) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      const doc = characterSchema.parse(input),
        current = await getCharacter(id);
      if (doc.id !== id || doc.revision !== current.revision)
        throw new StudioError("Another window changed this project. Reopen it before saving.", 409);
      if (JSON.stringify(doc.artwork) !== JSON.stringify(current.artwork))
        throw new StudioError("Saving character settings cannot replace the original artwork.");
      await getAssets(id, doc);
      const next = {
        ...doc,
        createdAt: current.createdAt,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      const p = await directory(id),
        tmp = join(p, `.save-${randomUUID()}.json`);
      try {
        await writeFile(tmp, JSON.stringify(next, null, 2), { flag: "wx" });
        await rename(tmp, join(p, "character.json"));
      } finally {
        await rm(tmp, { force: true });
      }
      return next;
    });
  pending.set(id, task);
  try {
    return await task;
  } finally {
    if (pending.get(id) === task) pending.delete(id);
  }
}
export async function copyExample(input: unknown) {
  const doc = characterSchema.parse(input);
  if (doc.id !== DEFAULT_EXAMPLE_ID || doc.revision !== 0)
    throw new StudioError("Invalid example document.");
  return createCharacter(
    doc.name === "Sovia" ? "Sovia copy" : doc.name,
    doc.landmarks,
    await getExampleArtwork(),
    doc,
    await getAssets(DEFAULT_EXAMPLE_ID, doc),
  );
}
export function validateAssetFiles(doc: Character, assets: AssetFiles) {
  const refs = resourceImages(doc.resources);
  const required = new Set(refs.map((a) => a.sha256));
  if (Object.keys(assets).some((hash) => !required.has(hash)))
    throw new StudioError("Unreferenced part images are not accepted.");
  let size = 0;
  for (const asset of refs) {
    const bytes = assets[asset.sha256];
    if (!bytes) throw new StudioError("A referenced part image is missing.");
    size += bytes.length;
    const info = inspectPng(bytes, 1);
    if (info.sha256 !== asset.sha256 || info.width !== asset.width || info.height !== asset.height)
      throw new StudioError("A part image does not match its checksum or dimensions.");
  }
  if (size > MAX_RESOURCE_BYTES) throw new StudioError("The resource set is too large.");
}
export async function getAsset(id: string, hash: string) {
  digestSchema.parse(hash);
  const bytes =
    id === DEFAULT_EXAMPLE_ID
      ? await getExampleAsset(hash)
      : await safeRead(join(await assetDirectory(id), `${hash}.png`));
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw new StudioError("The part image checksum does not match.");
  return bytes;
}
export async function getAssets(id: string, doc?: Character): Promise<AssetFiles> {
  const current = doc ?? (await getCharacter(id));
  const assets: AssetFiles = {};
  for (const image of resourceImages(current.resources))
    assets[image.sha256] = await getAsset(id, image.sha256);
  validateAssetFiles(current, assets);
  return assets;
}
export async function uploadAsset(id: string, bytes: Uint8Array) {
  if (id === DEFAULT_EXAMPLE_ID)
    throw new StudioError("Save an editable copy before importing part images.", 403);
  const image = inspectPng(bytes, 1);
  const path = join(await assetDirectory(id, true), `${image.sha256}.png`);
  try {
    await writeFile(path, bytes, { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    await getAsset(id, image.sha256);
  }
  return { sha256: image.sha256, width: image.width, height: image.height };
}
async function assetDirectory(id: string, create = false) {
  const path = join(await directory(id), "assets");
  if (create) await mkdir(path, { recursive: true });
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink())
    throw new StudioError("The part image directory must be a regular directory.");
  return path;
}
