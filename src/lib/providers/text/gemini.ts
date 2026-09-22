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
          generationConfig: {
            // 최신 flash 모델은 기본적으로 답하기 전에 내부적으로 "생각"하는 시간을 쓸 수 있는데,
            // 그동안은 스트리밍 토큰이 하나도 안 나와서 클라이언트 입장에선 그냥 멈춘 것처럼 보인다.
            // 순수 글쓰기 작업은 깊은 추론이 필요 없으므로 thinking을 꺼서 첫 토큰이 훨씬 빨리
            // 나오게 한다(타임아웃 방지). 다만 grounding(실시간 검색)을 쓸 때는 모델이 검색 여부/
            // 시점을 판단해야 하니 thinking을 끄지 않는다.
            ...(input.grounding ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
            ...(input.json ? { responseMimeType: "application/json" } : {}),
          },
          // 실제 상품명을 웹에서 검색해 진짜 가격/스펙/후기 정보를 찾아 쓰게 한다(할루시네이션 방지 +
          // "사용자가 적어준 내용만 그대로 붙여쓴다"는 문제 해결). json 모드와는 동시에 못 쓴다.
          ...(input.grounding && !input.json ? { tools: [{ googleSearch: {} }] } : {}),
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
