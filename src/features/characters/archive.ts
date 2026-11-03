import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { MAX_DOCUMENT_BYTES } from "@/features/characters/resources";
import { type Character, characterSchema } from "./document";
import {
  type AssetFiles,
  MAX_ARCHIVE_BYTES,
  MAX_RESOURCE_BYTES,
  resourceImages,
  resourcePath,
} from "./resources";
export function packCharacter(doc: Character, image: Uint8Array, assets: AssetFiles = {}) {
  const parsed = characterSchema.parse(doc);
  const entries: Record<string, Uint8Array> = {
    "character.json": strToU8(JSON.stringify(parsed, null, 2)),
    "artwork/portrait.png": image,
  };
  for (const asset of resourceImages(parsed.resources)) {
    const bytes = assets[asset.sha256];
    if (!bytes) throw new Error("A referenced part image is missing.");
    entries[resourcePath(asset.sha256)] = bytes;
  }
  if (Object.values(entries).reduce((sum, b) => sum + b.length, 0) > MAX_RESOURCE_BYTES)
    throw new Error("The resource set is too large.");
  return zipSync(entries, { level: 6 });
}
export function unpackCharacter(bytes: Uint8Array) {
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error("The archive is too large.");
  let total = 0;
  const seen = new Set<string>();
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (
        !["character.json", "artwork/portrait.png"].includes(f.name) &&
        !/^assets\/[a-f0-9]{64}\.png$/.test(f.name)
      )
        throw new Error("The archive contains an unknown file.");
      if (seen.has(f.name) || seen.size >= 66)
        throw new Error("The archive contains duplicate or excessive entries.");
      seen.add(f.name);
      total += f.originalSize;
      if (
        total > MAX_RESOURCE_BYTES ||
        f.originalSize > (f.name === "character.json" ? MAX_DOCUMENT_BYTES : 20 * 1024 * 1024)
      )
        throw new Error("The unpacked archive is too large.");
      return true;
    },
  });
  if (!files["character.json"] || !files["artwork/portrait.png"])
    throw new Error("The archive is missing its document or artwork.");
  const document = characterSchema.parse(JSON.parse(strFromU8(files["character.json"])));
  const assets: AssetFiles = {};
  const expected = new Set(["character.json", "artwork/portrait.png"]);
  for (const asset of resourceImages(document.resources)) {
    const path = resourcePath(asset.sha256);
    if (!files[path]) throw new Error("A referenced part image is missing.");
    assets[asset.sha256] = files[path];
    expected.add(path);
  }
  if (Object.keys(files).some((name) => !expected.has(name)))
    throw new Error("The archive contains unreferenced images.");
  return {
    document,
    image: files["artwork/portrait.png"],
    assets,
  };
}
