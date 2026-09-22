"use client";

import { useCallback, useState } from "react";
import { base64ToBlob } from "@/lib/imageUtils";
import type { Aspect, ImageProviderId } from "@/lib/providers/image/meta";

const IMAGE_TIMEOUT_MS = 60_000;

export interface ImageGenErrorInfo {
  kind: string;
  message: string;
  provider?: string;
}

export interface GenerateImageParams {
  promptEn: string;
  aspect: Aspect;
  refImageBase64?: string;
  quality?: "low" | "medium" | "high";
  providerOrder: ImageProviderId[];
  apiKeys: { gemini?: string; openai?: string; huggingface?: string };
}

type ImageGenResult =
  | { ok: true; blob: Blob; provider: string; skipped: { provider: string; message: string }[] }
  | { ok: false; error: ImageGenErrorInfo };

/** /api/image를 호출하는 훅. 타임아웃 60초(오류 방지 규칙 13). */
export function useImageGeneration() {
  const [isLoading, setIsLoading] = useState(false);

  const generate = useCallback(async (params: GenerateImageParams): Promise<ImageGenResult> => {
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (params.apiKeys.gemini) headers["x-gemini-key"] = params.apiKeys.gemini;
      if (params.apiKeys.openai) headers["x-openai-key"] = params.apiKeys.openai;
      if (params.apiKeys.huggingface) headers["x-hf-key"] = params.apiKeys.huggingface;

      const res = await fetch("/api/image", {
        method: "POST",
        headers,
        body: JSON.stringify({
          promptEn: params.promptEn,
          aspect: params.aspect,
          refImageBase64: params.refImageBase64,
          quality: params.quality,
          providerOrder: params.providerOrder,
        }),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || typeof json?.imageBase64 !== "string") {
        return {
          ok: false,
          error: json?.error ?? { kind: "UNKNOWN", message: "이미지 생성에 실패했어요." },
        };
      }

      return {
        ok: true,
        blob: base64ToBlob(json.imageBase64, json.mime ?? "image/jpeg"),
        provider: json.provider,
        skipped: Array.isArray(json.skipped) ? json.skipped : [],
      };
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
