import { failure } from "@/server/http";
import { getAsset } from "@/server/storage";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; hash: string }> },
) {
  try {
    const { id, hash } = await params;
    return new Response(new Uint8Array(await getAsset(id, hash)), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
