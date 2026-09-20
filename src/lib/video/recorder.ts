// Canvas + MediaRecorder + WebAudio 합성 (PROMPT.md 9-3절).
// 오디오 시계(AudioContext.currentTime)를 마스터 클록으로 써서 자막/영상과 음성 싱크를 맞춘다.

import type { Timeline } from "./timeline";
import { drawFrame, ensureFontsLoaded, RESOLUTION_SIZES, type RenderSettings } from "./renderer";
import type { Resolution } from "@/lib/types";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export interface RecordOptions {
  timeline: Timeline;
  settings: RenderSettings;
  images: Map<string, ImageBitmap>;
  resolution: Resolution;
  onProgress?: (currentSeconds: number, totalSeconds: number) => void;
  signal?: AbortSignal;
}

export interface RecordResult {
  blob: Blob;
  mimeType: string;
}

/**
 * 반드시 사용자 클릭 핸들러 안에서 호출해야 한다(AudioContext 자동재생 정책, 규칙 5).
 */
export async function recordVideo(options: RecordOptions): Promise<RecordResult> {
  const { width, height } = RESOLUTION_SIZES[options.resolution];
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");

  await ensureFontsLoaded();

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    throw new Error("이 브라우저는 영상 녹화를 지원하지 않아요. 크롬이나 엣지를 이용해 주세요.");
  }

  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextCtor();
  await audioCtx.resume();
  const dest = audioCtx.createMediaStreamDestination();

  const startTime = audioCtx.currentTime + 0.15;

  for (const ts of options.timeline.scenes) {
    if (!ts.audioBlob) continue;
    try {
      const arrayBuffer = await ts.audioBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(dest);
      source.start(startTime + ts.startTime);
    } catch {
      // 디코딩 실패한 장면은 무음 처리한다(규칙: 실패해도 전체 녹화를 막지 않음).
    }
  }

  const canvasStream = canvas.captureStream(30);
  const audioTrack = dest.stream.getAudioTracks()[0];
  if (audioTrack) canvasStream.addTrack(audioTrack);

  const videoBitsPerSecond = options.resolution === "1080p" ? 8_000_000 : 4_000_000;
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("녹화 중 오류가 발생했어요."));
  });

  recorder.start(1000);

  const totalDuration = options.timeline.totalDuration;
  let aborted = false;
  const onAbort = () => {
    aborted = true;
  };
  options.signal?.addEventListener("abort", onAbort);

  await new Promise<void>((resolve) => {
    function loop() {
      if (aborted) {
        resolve();
        return;
      }
      const t = audioCtx.currentTime - startTime;
      if (t >= 0) {
        drawFrame(ctx!, options.timeline, Math.min(t, totalDuration), options.settings, options.images);
        options.onProgress?.(Math.min(t, totalDuration), totalDuration);
      }
      if (t >= totalDuration + 0.3) {
        resolve();
        return;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });

  options.signal?.removeEventListener("abort", onAbort);

  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  audioCtx.close().catch(() => {});

  if (aborted) {
    throw new Error("녹화가 취소됐어요.");
  }

  return { blob: new Blob(chunks, { type: mimeType }), mimeType };
}
