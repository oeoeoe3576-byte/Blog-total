"use client";

import { useCallback, useState } from "react";
import { getAudioDuration } from "@/lib/audio";
import type { TtsProviderId } from "@/lib/providers/tts/meta";

const TTS_TIMEOUT_MS = 30_000; // 오류 방지 규칙 13: TTS 30초 타임아웃

export interface TtsGenErrorInfo {
  kind: string;
  message: string;
  provider?: string;
}

export interface GenerateTtsParams {
  text: string;
  voice: string;
  rate: number;
  providerOrder: TtsProviderId[];
  apiKeys: { gemini?: string; openai?: string };
}

type TtsGenResult =
  | { ok: true; blob: Blob; provider: string; durationSeconds: number }
  | { ok: false; error: TtsGenErrorInfo };

export function useTtsGeneration() {
  const [isLoading, setIsLoading] = useState(false);

  const generate = useCallback(async (params: GenerateTtsParams): Promise<TtsGenResult> => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (params.apiKeys.gemini) headers["x-gemini-key"] = params.apiKeys.gemini;
      if (params.apiKeys.openai) headers["x-openai-key"] = params.apiKeys.openai;

      const res = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: params.text,
          voice: params.voice,
          rate: params.rate,
          providerOrder: params.providerOrder,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        return {
          ok: false,
          error: json?.error ?? { kind: "UNKNOWN", message: "더빙 생성에 실패했어요." },
        };
      }

      const blob = await res.blob();
      const provider = res.headers.get("x-provider") ?? "unknown";
      const durationSeconds = await getAudioDuration(blob).catch(() => 0);

      return { ok: true, blob, provider, durationSeconds };
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      return {
        ok: false,
        error: {
          kind: "NETWORK",
          message: aborted
            ? "요청 시간이 초과되었거나 취소됐어요."
            : err instanceof Error
              ? err.message
              : "알 수 없는 오류가 발생했어요.",
        },
      };
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

  return { generate, isLoading };
}
