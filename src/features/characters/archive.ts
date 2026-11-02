import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { type Character, characterSchema } from "./document";
export function packCharacter(doc: Character, image: Uint8Array) {
  return zipSync(
    {
      "character.json": strToU8(JSON.stringify(characterSchema.parse(doc), null, 2)),
      "artwork/portrait.png": image,
    },
    { level: 6 },
  );
}
export function unpackCharacter(bytes: Uint8Array) {
  if (bytes.length > 24 * 1024 * 1024) throw new Error("The archive is too large.");
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      if (!["character.json", "artwork/portrait.png"].includes(f.name))
        throw new Error("The archive contains an unknown file.");
      total += f.originalSize;
      if (
        total > 22 * 1024 * 1024 ||
        f.originalSize > (f.name === "character.json" ? 65536 : 20 * 1024 * 1024)
      )
        throw new Error("The unpacked archive is too large.");
      return true;
    },
  });
  if (!files["character.json"] || !files["artwork/portrait.png"])
    throw new Error("The archive is missing its document or artwork.");
  return {
    document: characterSchema.parse(JSON.parse(strFromU8(files["character.json"]))),
    image: files["artwork/portrait.png"],
  };
}
