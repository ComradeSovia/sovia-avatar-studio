import { ZodError } from "zod";
import { StudioError } from "./storage";
export function checkWrite(request: Request) {
  const origin = request.headers.get("origin");
  // Next can normalize Request.url to localhost internally; Host retains the browser authority.
  const target = new URL(`http://${request.headers.get("host") ?? new URL(request.url).host}`);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && new URL(origin).host !== target.host)
  )
    throw new StudioError("Only requests from the local studio can make changes.", 403);
}
export async function boundedBody(request: Request, limit = 24 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new StudioError("The file is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new StudioError("The request body is missing.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new StudioError("The file is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export function failure(error: unknown) {
  if (error instanceof SyntaxError)
    return Response.json({ error: "The character data is not valid JSON." }, { status: 400 });
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Invalid character data." },
      { status: 400 },
    );
  if (error instanceof StudioError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("[studio]", error);
  return Response.json(
    { error: "The operation failed. Check the project files and try again." },
    { status: 500 },
  );
}
