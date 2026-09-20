import { NextResponse } from "next/server";
import { z } from "zod";
import { runChain } from "@/lib/providers/chain";
import { ProviderError, type ApiKeys, type ErrorKind } from "@/lib/providers/types";
import { TTS_ADAPTERS } from "@/lib/providers/tts";
import { DEFAULT_TTS_PROVIDER_ORDER, clampRate, type TtsProviderId } from "@/lib/providers/tts/meta";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().min(1),
  voice: z.string().min(1),
  rate: z.number().default(1),
  providerOrder: z.array(z.enum(["edge", "gemini", "openai"])).optional(),
});

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  AUTH: 401,
  QUOTA: 429,
  UNSUPPORTED: 501,
  NETWORK: 502,
  BAD_RESPONSE: 502,
  UNKNOWN: 500,
};

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

  const { text, voice, rate, providerOrder } = parsed.data;

  const keys: ApiKeys = {
    gemini: request.headers.get("x-gemini-key") || undefined,
    openai: request.headers.get("x-openai-key") || undefined,
  };

  const order: TtsProviderId[] = providerOrder ?? DEFAULT_TTS_PROVIDER_ORDER;
  const adapters = order.map((id) => TTS_ADAPTERS[id]);

  try {
    const { output, provider } = await runChain(adapters, { text, voice, rate: clampRate(rate) }, keys);

    return new Response(new Uint8Array(output.audio), {
      headers: {
        "content-type": output.format === "wav" ? "audio/wav" : "audio/mpeg",
        "x-provider": provider.id,
        "x-audio-format": output.format,
      },
    });
  } catch (err) {
    const kind: ErrorKind = err instanceof ProviderError ? err.kind : "UNKNOWN";
    const message =
      err instanceof Error ? err.message : "알 수 없는 오류로 더빙 생성에 실패했어요.";
    const provider = err instanceof ProviderError ? err.provider : undefined;

    return NextResponse.json(
      { error: { kind, message, provider } },
      { status: STATUS_BY_KIND[kind] },
    );
  }
}
