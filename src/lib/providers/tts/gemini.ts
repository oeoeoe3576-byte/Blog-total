// Gemini TTS 어댑터. 문서: https://ai.google.dev/gemini-api/docs/speech-generation (2026-09 기준)
// 응답은 raw PCM(24kHz, 16bit, mono)이라 WAV로 감싸서 반환한다(오류 방지 규칙 9).

import type { ApiKeys, ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { classifyHttpStatus } from "../httpError";
import { pcmToWav } from "@/lib/wav";
import { TTS_PROVIDER_META } from "./meta";
import type { TtsInput, TtsOutput } from "./types";

const MODEL = "gemini-2.5-flash-preview-tts";

interface GeminiErrorBody {
  error?: { message?: string };
}

export const geminiTtsAdapter: ProviderAdapter<TtsInput, TtsOutput> = {
  meta: TTS_PROVIDER_META.gemini,

  isAvailable: (keys: ApiKeys) => Boolean(keys.gemini),

  run: async (input, keys) => {
    const apiKey = keys.gemini;
    if (!apiKey) throw new ProviderError("AUTH", "gemini", "Gemini API 키가 없어요.");

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input.text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: input.voice } } },
            },
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
        body.error?.message || `Gemini TTS 요청이 실패했어요 (HTTP ${response.status}).`,
      );
    }

    const json = await response.json();
    const part = json?.candidates?.[0]?.content?.parts?.[0];
    const base64 = part?.inlineData?.data;
    if (typeof base64 !== "string") {
      throw new ProviderError("BAD_RESPONSE", "gemini", "Gemini가 오디오를 반환하지 않았어요.");
    }

    const pcm = Buffer.from(base64, "base64");
    return { audio: pcmToWav(pcm), format: "wav" };
  },
};
