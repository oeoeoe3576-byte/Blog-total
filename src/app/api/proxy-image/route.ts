import { NextResponse } from "next/server";
import sharp from "sharp";
import { fetchSafely } from "@/lib/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_LONG_SIDE = 1600;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: "url 파라미터가 필요해요." } },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetchSafely(url, { maxRedirects: 3, timeoutMs: 10_000 });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          kind: "NETWORK",
          message: err instanceof Error ? err.message : "이미지를 가져오지 못했어요.",
        },
      },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: `이미지 요청이 실패했어요 (HTTP ${res.status}).` } },
      { status: 502 },
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: { kind: "UNSUPPORTED", message: "이미지가 아닌 응답이에요." } },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: { kind: "UNSUPPORTED", message: "이미지 용량이 너무 커요(8MB 초과)." } },
      { status: 413 },
    );
  }

  try {
    const resized = await sharp(buffer)
      .resize({ width: MAX_LONG_SIDE, height: MAX_LONG_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return new Response(new Uint8Array(resized), {
      headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600" },
    });
  } catch {
    // sharp가 못 읽는 형식이면 원본을 그대로 반환한다(용량 제한은 이미 통과함).
    return new Response(new Uint8Array(buffer), {
      headers: { "content-type": contentType, "cache-control": "public, max-age=3600" },
    });
  }
}
