// Hugging Face Inference API(FLUX.1-schnell) 이미지 생성 어댑터.
// 콜드스타트(503 + estimated_time) 시 최대 2회까지 대기 후 재시도한다.

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { ASPECT_SIZES, IMAGE_PROVIDER_META } from "./meta";
import type { ImageGenInput } from "./types";

const MODEL = "black-forest-labs/FLUX.1-schnell";
const MAX_ATTEMPTS = 2;

export const huggingfaceImageAdapter: ProviderAdapter<ImageGenInput, Buffer> = {
  meta: IMAGE_PROVIDER_META.huggingface,

  isAvailable: (keys: ApiKeys) => Boolean(keys.huggingface),

  run: async (input, keys) => {
    const apiKey = keys.huggingface;
    if (!apiKey) throw new ProviderError("AUTH", "huggingface", "Hugging Face 토큰이 없어요.");

    const { width, height } = ASPECT_SIZES[input.aspect];

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let res: Response;
      try {
        res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ inputs: input.promptEn, parameters: { width, height } }),
        });
      } catch {
        throw new ProviderError("NETWORK", "huggingface", "Hugging Face에 연결할 수 없어요.");
      }

      if (res.status === 503) {
        let estimatedSeconds = 5;
        try {
          const body = await res.json();
          if (typeof body?.estimated_time === "number") estimatedSeconds = body.estimated_time;
        } catch {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(estimatedSeconds * 1000, 10_000)));
        continue;
      }

      if (!res.ok) {
        throw new ProviderError(
          classifyHttpStatus(res.status),
          "huggingface",
          `Hugging Face 요청이 실패했어요 (HTTP ${res.status}).`,
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        throw new ProviderError("BAD_RESPONSE", "huggingface", "이미지가 아닌 응답을 받았어요.");
      }
      return Buffer.from(await res.arrayBuffer());
    }

    throw new ProviderError(
      "NETWORK",
      "huggingface",
      "모델이 아직 준비되지 않았어요(콜드 스타트). 잠시 후 다시 시도해 주세요.",
    );
  },
};
