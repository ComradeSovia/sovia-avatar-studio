import { boundedBody, checkWrite, failure } from "@/server/http";
import { getCharacter, saveCharacter } from "@/server/storage";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_: Request, context: Context) {
  try {
    return Response.json(await getCharacter((await context.params).id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    checkWrite(request);
    const bytes = await boundedBody(request, 65536);
    return Response.json(
      await saveCharacter((await context.params).id, JSON.parse(bytes.toString())),
    );
  } catch (e) {
    return failure(e);
  }
}
