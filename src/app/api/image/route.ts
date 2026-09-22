import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { runChain } from "@/lib/providers/chain";
import { ProviderError, type ApiKeys, type ErrorKind } from "@/lib/providers/types";
import { IMAGE_ADAPTERS } from "@/lib/providers/image";
import { ASPECT_SIZES, DEFAULT_IMAGE_PROVIDER_ORDER, type ImageProviderId } from "@/lib/providers/image/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

const bodySchema = z.object({
  promptEn: z.string().min(1),
  aspect: z.enum(["9:16", "16:9", "1:1"]),
  refImageBase64: z.string().optional(),
  quality: z.enum(["low", "medium", "high"]).optional(),
  providerOrder: z.array(z.enum(["gemini", "pollinations", "huggingface", "openai"])).optional(),
});

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  AUTH: 401,
  QUOTA: 429,
  UNSUPPORTED: 501,
  NETWORK: 502,
  BAD_RESPONSE: 502,
  UNKNOWN: 500,
};

/** 4MB 이하가 될 때까지 jpeg 품질을 단계적으로 낮춘다(Vercel 응답 본문 제한 대응, 규칙 2). */
async function toJpegUnderLimit(buffer: Buffer, targetWidth: number, targetHeight: number): Promise<Buffer> {
  const qualities = [85, 75, 65, 50];
  let last: Buffer | null = null;
  for (const quality of qualities) {
    last = await sharp(buffer)
      .resize({ width: targetWidth, height: targetHeight, fit: "cover" })
      .jpeg({ quality })
      .toBuffer();
    if (last.byteLength <= MAX_BYTES) return last;
  }
  return last as Buffer;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: "요청 본문이 올바른 JSON이 아니에요." } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { kind: "BAD_RESPONSE", message: "요청 형식이 올바르지 않아요." } },
      { status: 400 },
    );
  }

  const { promptEn, aspect, refImageBase64, quality, providerOrder } = parsed.data;

  const keys: ApiKeys = {
    gemini: request.headers.get("x-gemini-key") || undefined,
    openai: request.headers.get("x-openai-key") || undefined,
    huggingface: request.headers.get("x-hf-key") || undefined,
  };

  const order: ImageProviderId[] = providerOrder ?? DEFAULT_IMAGE_PROVIDER_ORDER;
  const adapters = order.map((id) => IMAGE_ADAPTERS[id]);

  try {
    const { output: rawBuffer, provider, skipped } = await runChain(
      adapters,
      { promptEn, aspect, refImageBase64, quality },
      keys,
    );

    const { width, height } = ASPECT_SIZES[aspect];
    const jpeg = await toJpegUnderLimit(rawBuffer, width, height);

    return NextResponse.json({
      imageBase64: jpeg.toString("base64"),
      mime: "image/jpeg",
      provider: provider.id,
      skipped,
    });
  } catch (err) {
    const kind: ErrorKind = err instanceof ProviderError ? err.kind : "UNKNOWN";
    const message =
      err instanceof Error ? err.message : "알 수 없는 오류로 이미지 생성에 실패했어요.";
    const provider = err instanceof ProviderError ? err.provider : undefined;

    return NextResponse.json(
      { error: { kind, message, provider } },
      { status: STATUS_BY_KIND[kind] },
    );
  }
}
