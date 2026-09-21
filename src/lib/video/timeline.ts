// 장면 길이 계산과 자막(내레이션) 분할. PROMPT.md 9-1절.

import type { Scene } from "@/lib/types";

export const SYLLABLES_PER_SECOND = 5.5;
export const MIN_SCENE_SECONDS = 2.5;
export const CROSSFADE_SECONDS = 0.25;
export const WARN_TOTAL_SECONDS = 50;

export interface NarrationChunk {
  text: string;
  startTime: number; // 장면 시작 기준 상대 시간(초)
  endTime: number;
}

export interface TimelineScene {
  scene: Scene;
  imageBlobKey?: string;
  mediaType: "image" | "video";
  audioBlob?: Blob;
  startTime: number; // 전체 영상 기준 절대 시간(초)
  duration: number;
  narrationChunks: NarrationChunk[];
  hasImage: boolean;
}

export interface Timeline {
  scenes: TimelineScene[];
  totalDuration: number;
}

/** 공백 단위로 최대 maxChars자 내외의 자막 청크로 나눈다. */
export function chunkText(text: string, maxChars = 26): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export interface AudioInfo {
  blob: Blob;
  durationSeconds: number;
}

export function buildTimeline(
  scenes: Scene[],
  getImageKey: (sceneId: string) => string | undefined,
  getAudio: (sceneId: string) => AudioInfo | undefined,
  dubbingOn: boolean,
  getMediaType?: (sceneId: string) => "image" | "video" | undefined,
): Timeline {
  let cursor = 0;

  const timelineScenes: TimelineScene[] = scenes.map((scene) => {
    const audio = dubbingOn ? getAudio(scene.id) : undefined;
    const duration = audio
      ? audio.durationSeconds + 0.3
      : Math.max(MIN_SCENE_SECONDS, scene.narration.length / SYLLABLES_PER_SECOND);

    const chunks = chunkText(scene.narration);
    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
    let chunkCursor = 0;
    const narrationChunks: NarrationChunk[] = chunks.map((text) => {
      const chunkDuration = (text.length / totalChars) * duration;
      const startTime = chunkCursor;
      chunkCursor += chunkDuration;
      return { text, startTime, endTime: chunkCursor };
    });

    const imageBlobKey = getImageKey(scene.id);
    const timelineScene: TimelineScene = {
      scene,
      imageBlobKey,
      mediaType: getMediaType?.(scene.id) ?? "image",
      audioBlob: audio?.blob,
      startTime: cursor,
      duration,
      narrationChunks,
      hasImage: Boolean(imageBlobKey),
    };
    cursor += duration;
    return timelineScene;
  });

  return { scenes: timelineScenes, totalDuration: cursor };
}

export interface ActiveScene {
  scene: TimelineScene;
  localT: number;
  index: number;
}

export function findActiveScene(timeline: Timeline, t: number): ActiveScene | null {
  const { scenes } = timeline;
  if (scenes.length === 0) return null;

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    if (t >= s.startTime && t < s.startTime + s.duration) {
      return { scene: s, localT: t - s.startTime, index: i };
    }
  }

  const last = scenes[scenes.length - 1];
  return { scene: last, localT: last.duration, index: scenes.length - 1 };
}

export function activeNarrationChunk(scene: TimelineScene, localT: number): string {
  const chunk = scene.narrationChunks.find((c) => localT >= c.startTime && localT < c.endTime);
  return chunk?.text ?? scene.narrationChunks[scene.narrationChunks.length - 1]?.text ?? "";
}
