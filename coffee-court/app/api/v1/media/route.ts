import { env } from "cloudflare:workers";
import { applicationSession, csrfValid } from "../../../../lib/auth-session";
import { validWriteOrigin } from "../../../../lib/auth-transport";
export const dynamic = "force-dynamic";
const error = (message: string, status = 400) =>
  Response.json({ error: message }, { status });
export async function POST(request: Request) {
  const session = await applicationSession(request);
  if (!session || session.role !== "admin")
    return error("Administrator access is required.", 403);
  if (!validWriteOrigin(request) || !csrfValid(request, session))
    return error("This request could not be verified.", 403);
  if (!env.BUCKET)
    return error(
      "Image storage is unavailable. Please try again shortly.",
      503,
    );
  // Hosted writes use the existing owner-private Site boundary, as do settings.
  if (Number(request.headers.get("content-length")) > 5 * 1024 * 1024 + 65536)
    return error("Choose an image smaller than 5 MB.", 413);
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
      return error("Choose a JPG, PNG or WebP image smaller than 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (v, i) => bytes[i] === v,
    );
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    const ext = png ? "png" : jpeg ? "jpg" : webp ? "webp" : "";
    const type = png ? "image/png" : jpeg ? "image/jpeg" : "image/webp";
    if (!ext || file.type !== type)
      return error("Upload a valid JPG, PNG or WebP image.");
    const key = `${crypto.randomUUID()}.${ext}`;
    await env.BUCKET.put(`hero/${key}`, bytes, {
      httpMetadata: {
        contentType: type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return Response.json(
      { image: `/api/v1/media/${key}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return error("The image could not be uploaded. Please try again.");
  }
}
