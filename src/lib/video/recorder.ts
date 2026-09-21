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
  videos?: Map<string, HTMLVideoElement>;
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
  // captureStream()이 프레임을 안정적으로 캡처하려면 캔버스가 실제로 페인트되어야 한다.
  // 뷰포트 밖 멀리(예: left: -99999px)에 두면 브라우저가 레이아웃/페인트를 건너뛰어
  // 스트림에 프레임이 전혀 실리지 않는 문제가 있었다(실제로 겪은 버그). 그래서 뷰포트
  // 안쪽 좌표에 두되 투명도를 낮춰 화면에는 보이지 않게 한다.
  canvas.style.position = "fixed";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.opacity = "0.01";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "-1";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    throw new Error("캔버스를 사용할 수 없어요.");
  }

  try {
    await ensureFontsLoaded();

    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      throw new Error("이 브라우저는 영상 녹화를 지원하지 않아요. 크롬이나 엣지를 이용해 주세요.");
    }

    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioContextCtor();
    await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();

    const startTime = audioCtx.currentTime + 0.15;

    // 실제로 재생을 예약한 오디오 소스가 하나도 없으면(더빙 OFF 등) 오디오 트랙을 아예
    // 붙이지 않는다. 아무 소리도 나지 않는 빈 MediaStreamAudioDestinationNode 트랙을
    // 캔버스 스트림에 섞으면 일부 환경에서 MediaRecorder가 영상 데이터를 전혀 flush하지
    // 않는 문제를 실제로 겪었다(오디오+영상 트랙이 섞인 스트림에서만 재현됨).
    let hasAudioSource = false;
    for (const ts of options.timeline.scenes) {
      if (!ts.audioBlob) continue;
      try {
        const arrayBuffer = await ts.audioBlob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(dest);
        source.start(startTime + ts.startTime);
        hasAudioSource = true;
      } catch {
        // 디코딩 실패한 장면은 무음 처리한다(규칙: 실패해도 전체 녹화를 막지 않음).
      }
    }

    const canvasStream = canvas.captureStream(30);
    if (hasAudioSource) {
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);
    }

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
          drawFrame(
            ctx!,
            options.timeline,
            Math.min(t, totalDuration),
            options.settings,
            options.images,
            options.videos,
          );
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

    if (chunks.length === 0) {
      throw new Error("녹화된 영상 데이터가 없어요. 다시 시도해 주세요.");
    }

    return { blob: new Blob(chunks, { type: mimeType }), mimeType };
  } finally {
    canvas.remove();
  }
}
