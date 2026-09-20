import type { Scene, SceneKind } from "./types";

export const SCENE_KIND_LABEL: Record<SceneKind, string> = { hook: "훅", scene: "장면", cta: "CTA" };

/** 대본을 "[훅] (자막: …) 내레이션" 형태의 복사용 텍스트로 바꾼다. */
export function formatSceneCopy(scenes: Scene[]): string {
  return scenes
    .map((s) => `[${SCENE_KIND_LABEL[s.kind]}] (자막: ${s.headline}) ${s.narration}`)
    .join("\n\n");
}
