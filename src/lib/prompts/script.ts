// 수정 가이드: 장면 개수, 목표 시간, 자막 길이를 바꾸려면 이 파일만 고치면 된다.

import type { Experience } from "@/lib/types";
import { BRAND_VOICE_GUIDE, COMMON_SYSTEM_RULES } from "./common";

/** 한국어 구어체 기준 초당 대략 음절 수 (프롬프트에 목표 글자수를 제시하기 위한 근사치) */
const SYLLABLES_PER_SECOND = 5.5;
const TARGET_MIN_SECONDS = 30;
const TARGET_MAX_SECONDS = 50;

const TARGET_CHAR_RANGE = {
  min: Math.round(TARGET_MIN_SECONDS * SYLLABLES_PER_SECOND),
  max: Math.round(TARGET_MAX_SECONDS * SYLLABLES_PER_SECOND),
};

const JSON_SCHEMA_GUIDE = `
반드시 아래 JSON 스키마 형식으로만 응답하세요. 다른 설명이나 코드블록 없이 JSON 객체 하나만 출력하세요.

{
  "scenes": [
    { "kind": "hook" | "scene" | "cta", "headline": string, "narration": string }
  ]
}

- 전체 장면은 6~9개로 구성하세요.
- 구성 순서: 훅(hook) → 상품을 고를 이유/신뢰 → 구성 소개 → 장점 → 솔직한 단점 → CTA(cta).
  중간 장면들의 kind는 모두 "scene"으로 표기하세요.
- headline: 자막으로 화면에 크게 나올 한 줄. 15자 내외로 짧고 강하게. 강조하고 싶은 핵심 단어는
  [[핵심어]] 처럼 이중 대괄호로 감싸세요.
- narration: 실제 내레이션(음성)으로 읽을 구어체 문장. 장면당 1~2문장. 사람이 말하듯 자연스럽게 쓰세요
  (~습니다체 금지, ~이거든요/~더라고요/~인 것 같아요 같은 구어체 어미를 쓰세요). 딱딱한 정보 나열이 아니라
  친구에게 말해주듯 쓰세요.
- narration 전체를 합친 글자 수가 대략 ${TARGET_CHAR_RANGE.min}~${TARGET_CHAR_RANGE.max}자 사이가 되도록
  하세요(전체 낭독 시간 ${TARGET_MIN_SECONDS}~${TARGET_MAX_SECONDS}초 목표, 한국어 기준 초당 약 ${SYLLABLES_PER_SECOND}음절).
- hook 장면의 narration은 위 브랜드 톤 가이드의 Hook 유형(질문형/공감형/발견·후회형) 중 하나로 시작해서
  처음 1초 안에 눈길을 끌어야 합니다.
- CTA 장면의 narration에는 "프로필/댓글의 링크에서 확인해보세요" 같은 표현을 사용하세요.
`.trim();

export function buildScriptSystemPrompt(experience: Experience): string {
  const experienceGuide =
    experience === "experienced"
      ? "이 대본은 실제 사용 경험을 바탕으로 합니다. 참고 자료에 없는 디테일은 지어내지 마세요."
      : `이 대본은 직접 사용해보지 않은 정보성 콘텐츠입니다. "써봤다", "사용해보니" 같은 경험 암시 표현을 쓰지 마세요.`;

  return [
    COMMON_SYSTEM_RULES,
    "당신은 30~50초 분량 숏폼(쇼츠/릴스) 영상 대본을 기획합니다.",
    BRAND_VOICE_GUIDE,
    experienceGuide,
    JSON_SCHEMA_GUIDE,
  ].join("\n\n");
}

export function buildScriptUserPrompt(sourceText: string): string {
  return `아래 내용을 참고 자료로 삼아 숏폼 대본을 기획하세요.\n\n<source>\n${sourceText}\n</source>`;
}
