import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { z } from "zod";
import { fetchSafely, validateExternalUrl } from "@/lib/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().min(1) });

function absolutize(maybeRelative: string, base: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: "상품 URL이 필요해요." } },
      { status: 400 },
    );
  }

  const validation = validateExternalUrl(parsed.data.url);
  if (!validation.ok) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: validation.reason } },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetchSafely(parsed.data.url, {
      timeoutMs: 10_000,
      headers: { "user-agent": "Mozilla/5.0 (compatible; BlogAgentBot/1.0)" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          kind: "NETWORK",
          message: err instanceof Error ? err.message : "페이지를 가져오지 못했어요.",
        },
      },
      { status: 502 },
    );
  }

  if (res.status === 403 || res.status === 999 || res.status === 429) {
    return NextResponse.json(
      {
        error: {
          kind: "BLOCKED",
          message:
            "이 사이트는 자동 접근을 차단하고 있어요. 이미지 우클릭 → 주소 복사 또는 파일 업로드를 이용해 주세요.",
        },
      },
      { status: 403 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: `페이지 요청이 실패했어요 (HTTP ${res.status}).` } },
      { status: 502 },
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return NextResponse.json(
      { error: { kind: "UNSUPPORTED", message: "HTML 페이지가 아니에요." } },
      { status: 415 },
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const finalUrl = res.url || parsed.data.url;

  const title = $('meta[property="og:title"]').attr("content") || $("title").text() || "";
  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  const imageUrls = new Set<string>();
  for (const selector of ['meta[property="og:image"]', 'meta[property="og:image:secure_url"]']) {
    $(selector).each((_, el) => {
      const raw = $(el).attr("content");
      const absolute = raw ? absolutize(raw, finalUrl) : null;
      if (absolute) imageUrls.add(absolute);
    });
  }

  return NextResponse.json({
    title: title.trim(),
    description: description.trim(),
    imageUrls: Array.from(imageUrls),
  });
}
