import { DEFAULT_EXAMPLE_ID } from "@/features/characters/example";
import { MAX_DOCUMENT_BYTES } from "@/features/characters/resources";
import { boundedBody, checkWrite, failure } from "@/server/http";
import { copyExample, StudioError } from "@/server/storage";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkWrite(request);
    if ((await params).id !== DEFAULT_EXAMPLE_ID) throw new StudioError("Example not found.", 404);
    const bytes = await boundedBody(request, MAX_DOCUMENT_BYTES);
    return Response.json(await copyExample(JSON.parse(bytes.toString())), { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
