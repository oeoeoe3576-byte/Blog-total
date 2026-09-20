// OpenAI TTS 어댑터. 문서: https://platform.openai.com/docs/guides/text-to-speech (2026-09 기준)
// gpt-4o-mini-tts는 speed 파라미터를 무시하는 경우가 보고되어 있다(알려진 제한, README 참고).

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { TTS_PROVIDER_META } from "./meta";
import type { TtsInput, TtsOutput } from "./types";

const MODEL = "gpt-4o-mini-tts";

interface OpenAiErrorBody {
  error?: { message?: string };
}

export const openaiTtsAdapter: ProviderAdapter<TtsInput, TtsOutput> = {
  meta: TTS_PROVIDER_META.openai,

  isAvailable: (keys: ApiKeys) => Boolean(keys.openai),

  run: async (input, keys) => {
    const apiKey = keys.openai;
    if (!apiKey) throw new ProviderError("AUTH", "openai", "OpenAI API 키가 없어요.");

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          input: input.text,
          voice: input.voice,
          response_format: "mp3",
          speed: input.rate,
          instructions: "한국어 여성, 차분하고 친근한 후기 톤으로 자연스럽게 읽어주세요.",
        }),
      });
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
      throw new ProviderError(
        classifyHttpStatus(response.status),
        "openai",
        body.error?.message || `OpenAI TTS 요청이 실패했어요 (HTTP ${response.status}).`,
      );
    }

    const audio = Buffer.from(await response.arrayBuffer());
    return { audio, format: "mp3" };
  },
};
