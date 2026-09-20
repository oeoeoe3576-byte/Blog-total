// OpenAI 텍스트 생성 어댑터 (REST, 순수 fetch — SDK 미사용).
// 문서: https://platform.openai.com/docs/api-reference/chat (2026-09 기준)
//
// 신형 모델은 max_tokens 대신 max_completion_tokens를 쓴다(PROMPT.md 오류 방지 규칙 8).
// 400 오류에 특정 파라미터가 언급되면 그 파라미터를 제거하고 1회 재시도한다.

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError, type ErrorKind } from "../types";
import { sseToTextStream } from "./sse";
import { TEXT_PROVIDER_META, DEFAULT_TEXT_MODEL } from "./meta";
import type { TextGenInput } from "./types";

const URL = "https://api.openai.com/v1/chat/completions";

interface OpenAiErrorBody {
  error?: { message?: string; type?: string; param?: string | null; code?: string | null };
}

function classifyStatus(httpStatus: number): ErrorKind {
  if (httpStatus === 401 || httpStatus === 403) return "AUTH";
  if (httpStatus === 429) return "QUOTA";
  if (httpStatus === 400) return "BAD_RESPONSE";
  if (httpStatus >= 500) return "NETWORK";
  return "UNKNOWN";
}

/** 오류 메시지에서 "'foo' 파라미터는 지원되지 않음" 류의 파라미터명을 추출한다. */
function findUnsupportedParam(message: string): string | null {
  const match = message.match(/'([a-zA-Z_]+)'/);
  return match ? match[1] : null;
}

function extractOpenAiText(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const delta = (choices[0] as { delta?: unknown })?.delta;
  const content = (delta as { content?: unknown })?.content;
  return typeof content === "string" ? content : "";
}

type OpenAiBody = Record<string, unknown>;

export const openaiTextAdapter: ProviderAdapter<TextGenInput, ReadableStream<Uint8Array>> = {
  meta: TEXT_PROVIDER_META.openai,

  isAvailable: (keys: ApiKeys) => Boolean(keys.openai),

  run: async (input, keys) => {
    const apiKey = keys.openai;
    if (!apiKey) {
      throw new ProviderError("AUTH", "openai", "OpenAI API 키가 없어요.");
    }

    const body: OpenAiBody = {
      model: input.model || DEFAULT_TEXT_MODEL.openai,
      stream: true,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      max_completion_tokens: 4096,
      ...(input.json ? { response_format: { type: "json_object" } } : {}),
    };

    const doFetch = (b: OpenAiBody) =>
      fetch(URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(b),
      });

    let response: Response;
    try {
      response = await doFetch(body);
    } catch {
      throw new ProviderError("NETWORK", "openai", "OpenAI에 연결할 수 없어요.");
    }

    if (response.status === 400) {
      let errBody: OpenAiErrorBody = {};
      try {
        errBody = await response.clone().json();
      } catch {
        // ignore
      }
      const param = errBody.error?.param || findUnsupportedParam(errBody.error?.message || "");
      if (param && param in body) {
        const retryBody = { ...body };
        delete retryBody[param];
        try {
          response = await doFetch(retryBody);
        } catch {
          throw new ProviderError("NETWORK", "openai", "OpenAI에 연결할 수 없어요.");
        }
      }
    }

    if (!response.ok || !response.body) {
      let errBody: OpenAiErrorBody = {};
      try {
        errBody = await response.json();
      } catch {
        // ignore
      }
      throw new ProviderError(
        classifyStatus(response.status),
        "openai",
        errBody.error?.message || `OpenAI 요청이 실패했어요 (HTTP ${response.status}).`,
      );
    }

    return sseToTextStream(response.body, extractOpenAiText);
  },
};
