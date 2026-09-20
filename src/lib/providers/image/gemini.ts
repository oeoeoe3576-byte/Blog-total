// Gemini 이미지 생성("나노 바나나") 어댑터. 문서: https://ai.google.dev/gemini-api/docs/image-generation

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { IMAGE_PROVIDER_META } from "./meta";
import type { ImageGenInput } from "./types";

const MODEL = "gemini-2.5-flash-image";

interface GeminiErrorBody {
  error?: { message?: string };
}

interface GeminiImagePart {
  inlineData?: { data?: string };
}

function findImageBase64(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const parts = (candidates[0] as { content?: { parts?: GeminiImagePart[] } })?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const found = parts.find((p) => typeof p?.inlineData?.data === "string");
  return found?.inlineData?.data ?? null;
}

export const geminiImageAdapter: ProviderAdapter<ImageGenInput, Buffer> = {
  meta: IMAGE_PROVIDER_META.gemini,

  isAvailable: (keys: ApiKeys) => Boolean(keys.gemini),

  run: async (input, keys) => {
    const apiKey = keys.gemini;
    if (!apiKey) throw new ProviderError("AUTH", "gemini", "Gemini API 키가 없어요.");

    const parts: Record<string, unknown>[] = [{ text: input.promptEn }];
    if (input.refImageBase64) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: input.refImageBase64 } });
    }

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        },
      );
    } catch {
      throw new ProviderError("NETWORK", "gemini", "Gemini에 연결할 수 없어요.");
    }

    if (!response.ok) {
      let body: GeminiErrorBody = {};
      try {
        body = await response.json();
      } catch {
        // ignore
      }
      throw new ProviderError(
        classifyHttpStatus(response.status),
        "gemini",
        body.error?.message || `Gemini 이미지 생성에 실패했어요 (HTTP ${response.status}).`,
      );
    }

    const json = await response.json();
    const base64 = findImageBase64(json);
    if (!base64) {
      throw new ProviderError("BAD_RESPONSE", "gemini", "Gemini가 이미지를 반환하지 않았어요.");
    }
    return Buffer.from(base64, "base64");
  },
};
