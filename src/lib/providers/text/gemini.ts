// Gemini 텍스트 생성 어댑터 (REST, 순수 fetch — SDK 미사용).
// 문서: https://ai.google.dev/api/generate-content (2026-09 기준, generateContent/streamGenerateContent)

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError, type ErrorKind } from "../types";
import { sseToTextStream } from "./sse";
import { TEXT_PROVIDER_META, DEFAULT_TEXT_MODEL } from "./meta";
import type { TextGenInput } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

interface GeminiErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

function classifyStatus(httpStatus: number, body: GeminiErrorBody): ErrorKind {
  const status = body.error?.status ?? "";
  if (httpStatus === 401 || httpStatus === 403 || status === "UNAUTHENTICATED" || status === "PERMISSION_DENIED") {
    return "AUTH";
  }
  if (httpStatus === 429 || status === "RESOURCE_EXHAUSTED") return "QUOTA";
  if (httpStatus === 400) return "BAD_RESPONSE";
  if (httpStatus >= 500) return "NETWORK";
  return "UNKNOWN";
}

function extractGeminiText(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof (p as { text?: unknown })?.text === "string" ? (p as { text: string }).text : ""))
    .join("");
}

export const geminiTextAdapter: ProviderAdapter<TextGenInput, ReadableStream<Uint8Array>> = {
  meta: TEXT_PROVIDER_META.gemini,

  isAvailable: (keys: ApiKeys) => Boolean(keys.gemini),

  run: async (input, keys) => {
    const apiKey = keys.gemini;
    if (!apiKey) {
      throw new ProviderError("AUTH", "gemini", "Gemini API 키가 없어요.");
    }

    const model = input.model || DEFAULT_TEXT_MODEL.gemini;
    const url = `${BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: input.user }] }],
          systemInstruction: { parts: [{ text: input.system }] },
          ...(input.json
            ? { generationConfig: { responseMimeType: "application/json" } }
            : {}),
        }),
      });
    } catch {
      throw new ProviderError("NETWORK", "gemini", "Gemini에 연결할 수 없어요.");
    }

    if (!response.ok || !response.body) {
      let body: GeminiErrorBody = {};
      try {
        body = await response.json();
      } catch {
        // 오류 본문이 JSON이 아니어도 무시하고 진행
      }
      const kind = classifyStatus(response.status, body);
      throw new ProviderError(
        kind,
        "gemini",
        body.error?.message || `Gemini 요청이 실패했어요 (HTTP ${response.status}).`,
      );
    }

    return sseToTextStream(response.body, extractGeminiText);
  },
};
