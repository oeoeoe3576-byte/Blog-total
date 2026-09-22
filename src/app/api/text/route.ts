import { NextResponse } from "next/server";
import { z } from "zod";
import { runChain } from "@/lib/providers/chain";
import { ProviderError, type ApiKeys, type ErrorKind } from "@/lib/providers/types";
import { TEXT_ADAPTERS } from "@/lib/providers/text";
import { DEFAULT_TEXT_PROVIDER_ORDER, type TextProviderId } from "@/lib/providers/text/meta";

// (참고) 이 Next.js 버전은 Edge 런타임이 deprecated라 nodejs가 기본/유일한 선택지다.
// maxDuration은 배포 플랫폼(Vercel)이 실제 상한을 정하고 이 값은 상한 내에서만 적용된다.
// 시스템 프롬프트가 길거나 모델 응답이 느릴 때 대비해 넉넉하게 선언해둔다.
export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  task: z.string().min(1),
  system: z.string().min(1),
  user: z.string().min(1),
  json: z.boolean().optional(),
  providerOrder: z.array(z.enum(["gemini", "openai"])).optional(),
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

  const { system, user, json: wantJson, providerOrder } = parsed.data;

  const keys: ApiKeys = {
    gemini: request.headers.get("x-gemini-key") || undefined,
    openai: request.headers.get("x-openai-key") || undefined,
  };

  const order: TextProviderId[] = providerOrder ?? DEFAULT_TEXT_PROVIDER_ORDER;
  const adapters = order.map((id) => TEXT_ADAPTERS[id]);

  try {
    const { output: stream, provider } = await runChain(
      adapters,
      { system, user, json: wantJson },
      keys,
    );

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-provider": provider.id,
      },
    });
  } catch (err) {
    const kind: ErrorKind = err instanceof ProviderError ? err.kind : "UNKNOWN";
    const message =
      err instanceof Error ? err.message : "알 수 없는 오류로 텍스트 생성에 실패했어요.";
    const provider = err instanceof ProviderError ? err.provider : undefined;

    return NextResponse.json(
      { error: { kind, message, provider } },
      { status: STATUS_BY_KIND[kind] },
    );
  }
}
