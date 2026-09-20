// OpenAI 이미지 생성 어댑터. 문서: https://platform.openai.com/docs/guides/image-generation (2026-09 기준)
// gpt-image 계열은 output_format을 지원하지 않고 항상 base64로 응답한다.

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { ASPECT_SIZES, IMAGE_PROVIDER_META } from "./meta";
import type { ImageGenInput } from "./types";

const MODEL = "gpt-image-2";

interface OpenAiErrorBody {
  error?: { message?: string };
}

export const openaiImageAdapter: ProviderAdapter<ImageGenInput, Buffer> = {
  meta: IMAGE_PROVIDER_META.openai,

  isAvailable: (keys: ApiKeys) => Boolean(keys.openai),

  run: async (input, keys) => {
    const apiKey = keys.openai;
    if (!apiKey) throw new ProviderError("AUTH", "openai", "OpenAI API 키가 없어요.");

    const { width, height } = ASPECT_SIZES[input.aspect];
    const size = `${width}x${height}`;
    const quality = input.quality ?? "low";

    let response: Response;
    try {
      if (input.refImageBase64) {
        const form = new FormData();
        form.append("model", MODEL);
        form.append("prompt", input.promptEn);
        form.append("size", size);
        form.append("quality", quality);
        const buf = Buffer.from(input.refImageBase64, "base64");
        form.append("image", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), "reference.jpg");

        response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}` },
          body: form,
        });
      } else {
        response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ model: MODEL, prompt: input.promptEn, size, quality }),
        });
      }
    } catch {
      throw new ProviderError("NETWORK", "openai", "OpenAI에 연결할 수 없어요.");
    }

    if (!response.ok) {
      let body: OpenAiErrorBody = {};
      try {
        body = await response.json();
      } catch {
        // ignore
      }
      const hint =
        response.status === 403
          ? " OpenAI 계정의 조직 인증(Organization Verification)이 필요할 수 있어요."
          : "";
      throw new ProviderError(
        classifyHttpStatus(response.status),
        "openai",
        (body.error?.message || `OpenAI 이미지 생성에 실패했어요 (HTTP ${response.status}).`) + hint,
      );
    }

    const json = await response.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 !== "string") {
      throw new ProviderError("BAD_RESPONSE", "openai", "OpenAI가 이미지를 반환하지 않았어요.");
    }
    return Buffer.from(b64, "base64");
  },
};
