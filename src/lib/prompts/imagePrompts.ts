// 수정 가이드: 이미지 스타일(조명, 배경, 금지 요소)을 바꾸려면 이 파일만 고치면 된다.

import type { Scene } from "@/lib/types";
import { COMMON_SYSTEM_RULES } from "./common";

const STYLE_GUIDE = `
- 실사 라이프스타일 사진 스타일, 화사한 주간 하이키 조명, 깔끔한 배경.
- 글자·로고·브랜드명·아이콘·화살표·그래픽 기호는 절대 넣지 마세요.
- 인물이 나온다면 한국인, 대략적인 연령대를 명시하세요.
`.trim();

const JSON_SCHEMA_GUIDE = `
반드시 아래 JSON 스키마로만 응답하세요. 다른 설명이나 코드블록 없이 JSON 객체 하나만 출력하세요.

{
  "prompts": [
    { "sceneId": string, "ko": string, "en": string }
  ]
}

- 입력으로 주어진 장면마다 정확히 하나씩 생성하세요(sceneId는 입력의 id를 그대로 사용).
- "ko"는 한국어로 장면을 설명하는 이미지 프롬프트, "en"은 이미지 생성 모델에 넣을 영어 프롬프트입니다.
`.trim();

export function buildImagePromptsSystemPrompt(): string {
  return [COMMON_SYSTEM_RULES, "당신은 숏폼 영상 장면에 어울리는 이미지 프롬프트를 만듭니다.", STYLE_GUIDE, JSON_SCHEMA_GUIDE].join(
    "\n\n",
  );
}

export function buildImagePromptsUserPrompt(scenes: Scene[]): string {
  const list = scenes
    .map((s) => `- id: ${s.id} / 종류: ${s.kind} / 자막: ${s.headline} / 내레이션: ${s.narration}`)
    .join("\n");
  return `아래 장면들에 어울리는 이미지 프롬프트를 만들어주세요.\n\n${list}`;
}
