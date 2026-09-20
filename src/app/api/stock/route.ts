// Pexels 무료 스톡 이미지 검색. 문서: https://www.pexels.com/api/documentation/

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ query: z.string().min(1) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: "검색어가 필요해요." } },
      { status: 400 },
    );
  }

  const apiKey = request.headers.get("x-pexels-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: { kind: "AUTH", message: "Pexels API 키가 없어요." } },
      { status: 401 },
    );
  }

  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(parsed.data.query)}&orientation=portrait&per_page=15`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { authorization: apiKey } });
  } catch {
    return NextResponse.json(
      { error: { kind: "NETWORK", message: "Pexels에 연결할 수 없어요." } },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const kind = res.status === 401 ? "AUTH" : res.status === 429 ? "QUOTA" : "BAD_RESPONSE";
    return NextResponse.json(
      { error: { kind, message: `Pexels 검색이 실패했어요 (HTTP ${res.status}).` } },
      { status: res.status },
    );
  }

  const data = await res.json();
  const results = Array.isArray(data.photos)
    ? data.photos.map((photo: Record<string, unknown>) => ({
        id: photo.id,
        thumbnail: (photo.src as Record<string, string>)?.medium,
        original: (photo.src as Record<string, string>)?.original,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
      }))
    : [];

  return NextResponse.json({ results });
}
