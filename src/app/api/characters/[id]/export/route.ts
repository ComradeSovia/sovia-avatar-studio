import { packCharacter } from "@/features/characters/archive";
import { failure } from "@/server/http";
import { getArtwork, getCharacter } from "@/server/storage";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params,
      doc = await getCharacter(id),
      image = await getArtwork(id);
    return new Response(new Uint8Array(packCharacter(doc, image)), {
      headers: {
        "Content-Type": "application/x-avatar-studio",
        "Content-Disposition": `attachment; filename="character.avatarstudio"; filename*=UTF-8''${encodeURIComponent(doc.name)}.avatarstudio`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
