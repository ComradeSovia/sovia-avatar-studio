import { unpackCharacter } from "@/features/characters/archive";
import { landmarksSchema } from "@/features/characters/document";
import { MAX_ARCHIVE_BYTES } from "@/features/characters/resources";
import { boundedBody, checkWrite, failure } from "@/server/http";
import { createCharacter, listCharacters, StudioError } from "@/server/storage";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await listCharacters(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkWrite(request);
    const bytes = await boundedBody(request, MAX_ARCHIVE_BYTES);
    if (request.headers.get("content-type") === "application/x-avatar-studio") {
      let data: ReturnType<typeof unpackCharacter>;
      try {
        data = unpackCharacter(bytes);
      } catch {
        throw new StudioError("The archive is invalid or its version is unsupported.");
      }
      return Response.json(
        await createCharacter(
          data.document.name,
          data.document.landmarks,
          data.image,
          data.document,
          data.assets,
        ),
        { status: 201 },
      );
    }
    const data = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const image = data.get("image");
    if (!(image instanceof File)) throw new StudioError("Choose a PNG image.");
    const landmarks = landmarksSchema.parse(JSON.parse(String(data.get("landmarks"))));
    return Response.json(
      await createCharacter(
        String(data.get("name") ?? ""),
        landmarks,
        new Uint8Array(await image.arrayBuffer()),
      ),
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
