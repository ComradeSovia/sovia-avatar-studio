import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { characterSchema } from "@/features/characters/document";
import { DEFAULT_EXAMPLE_ID } from "@/features/characters/example";
import { digestSchema, resourceImages, resourcePath } from "@/features/characters/resources";
import exampleDocument from "../../public/examples/sovia/character.json";

const document = characterSchema.parse(exampleDocument);
if (document.id !== DEFAULT_EXAMPLE_ID) throw new Error("The default example ID is inconsistent.");
let image: Promise<Buffer> | undefined;
export function getExampleDocument() {
  return structuredClone(document);
}
export function getExampleArtwork() {
  image ??= readFile(join(process.cwd(), "public", "examples", "sovia", "portrait.png")).then(
    (bytes) => {
      if (createHash("sha256").update(bytes).digest("hex") !== document.artwork.sha256) {
        throw new Error("The default example artwork checksum does not match its document.");
      }
      return bytes;
    },
  );
  return image;
}
export async function getExampleAsset(hash: string) {
  digestSchema.parse(hash);
  if (!resourceImages(document.resources).some((a) => a.sha256 === hash))
    throw new Error("Unknown example part image.");
  return readFile(join(process.cwd(), "public", "examples", "sovia", resourcePath(hash)));
}
