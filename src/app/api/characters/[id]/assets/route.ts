import { boundedBody, checkWrite, failure } from "@/server/http";
import { uploadAsset } from "@/server/storage";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkWrite(request);
    return Response.json(
      await uploadAsset((await params).id, await boundedBody(request, 20 * 1024 * 1024)),
      { status: 201 },
    );
  } catch (error) {
    return failure(error);
  }
}
