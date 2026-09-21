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

const HOOK_TYPE_GUIDE = `
**첫 3초 후킹(hook 장면)은 "예쁜 문장"이 아니라 "손가락을 멈추게 하는 문장"이어야 합니다.**
사람들은 릴스를 끝까지 보고 판단하지 않고, 첫 문장만 보고 넘길지 말지 정합니다.
아래 후킹 유형 중 이 상품/타깃에 가장 잘 맞는 것을 골라 hook 장면에 쓰세요.

- 찔리는형: 타깃이 속으로만 생각하던 뜨끔한 사실을 그대로 던진다 (예: "이거 아직도 모르고 사면 손해예요")
- 공감형: 처음이면 누구나 겪는 당황스러운 상황을 먼저 제시한다 (예: "이거 고르실 때 다들 한 번씩 고민하실 거예요")
- 반전형: 예상을 뒤집는 문장으로 시작한다 (예: "비싼 거 살 필요 없더라고요")
- 궁금증형: 결론을 바로 안 주고 궁금하게 만든다 (예: "이거 하나로 다 해결됐어요")
- 저장 유도형: "이건 저장해두고 보세요" 식으로 저장할 이유를 먼저 던진다
- 댓글 유도형: 의견이 갈릴 만한 질문을 먼저 던진다

hook 장면의 headline은 화면 썸네일 역할도 겸합니다. 12~18자 내외로 짧고, 광고 문구처럼 보이지 않게,
타깃의 고민이 바로 보이도록 쓰세요.
`.trim();

const CTA_TYPE_GUIDE = `
**CTA(마지막 장면)는 "정보 전달"로 끝내지 말고 구체적인 행동을 하나 요청하세요.**
조회수만 높고 댓글·저장·문의가 없는 콘텐츠는 대부분 마지막 문장이 약합니다. 아래 유형 중 이 콘텐츠에
가장 자연스러운 것 1~2개를 골라 CTA 문장에 녹이세요(세일즈처럼 부담스럽게 느껴지지 않게, 이유를 붙여서):

- 저장 유도형: "나중에 다시 보고 싶으면 저장해두세요"
- 댓글 유도형: "이거 궁금하신 분은 댓글에 [키워드] 남겨주세요"
- 팔로우 유도형: "더 자세한 후기는 프로필에서 확인해보세요"
- DM/문의 유도형: "자세한 건 댓글이나 DM으로 물어보세요"
`.trim();

const RETENTION_GUIDE = `
**쇼츠/릴스 알고리즘은 조회수가 아니라 "끝까지 본 비율"과 "다시 본 횟수"로 콘텐츠를 더 넓게 퍼뜨립니다.**
그래서 대본을 짤 때 아래 두 가지 이탈 방지 기법을 반드시 적용하세요.

- **오픈 루프(다음이 궁금하게 끝내기)**: hook과 중간 장면들은 결론을 다 주지 말고, 다음 장면에서만
  풀리는 궁금증을 하나씩 남기고 끝내세요 (예: "근데 막상 써보니까 예상 못 한 게 하나 있더라고요" →
  다음 장면에서 그걸 풀어준다). 각 장면의 narration 끝을 "그런데", "근데 문제는", "그래서 봤더니" 같은
  연결어로 마무리해 다음 장면을 기대하게 만드세요.
- **되감기 유도(루프 엔딩)**: 마지막 CTA 장면의 headline이나 narration 한 군데에 hook 장면의 핵심 단어나
  질문을 살짝 다시 언급하세요. 영상이 끝났을 때 처음 장면이 다시 떠오르면 시청자가 무의식적으로
  한 번 더 돌려보게 되고, 이게 완주율·재시청 지표를 올립니다.
- 한 장면에는 정보를 하나만 담고, 장면 전환마다 화면(headline)이 바뀌는 느낌을 주세요. 같은 톤이
  계속되면 이탈합니다.
`.trim();

const JSON_SCHEMA_GUIDE = `
반드시 아래 JSON 스키마 형식으로만 응답하세요. 다른 설명이나 코드블록 없이 JSON 객체 하나만 출력하세요.

{
  "scenes": [
    { "kind": "hook" | "scene" | "cta", "headline": string, "narration": string }
  ]
}

- 전체 장면은 6~9개로 구성하세요.
- 구성 순서(문제 → 공감 → 해결 → 행동 흐름을 따르세요): 훅(hook) → 문제 제기/공감 상황 → 상품을 고른 이유
  → 핵심 해결 포인트(장점) 2~3개 → 솔직한 단점 → CTA(cta). 중간 장면들의 kind는 모두 "scene"으로 표기하세요.
  설명이 길어지는 순간 이탈하니, 장면마다 정보를 나열하지 말고 한 장면에 한 가지 포인트만 담으세요.
- headline: 자막으로 화면에 크게 나올 한 줄. 15자 내외로 짧고 강하게. 강조하고 싶은 핵심 단어는
  [[핵심어]] 처럼 이중 대괄호로 감싸세요.
- narration: 실제 내레이션(음성)으로 읽을 구어체 문장. 장면당 1~2문장. 사람이 말하듯 자연스럽게 쓰세요
  (~습니다체 금지, ~이거든요/~더라고요/~인 것 같아요 같은 구어체 어미를 쓰세요). 딱딱한 정보 나열이 아니라
  친구에게 말해주듯 쓰세요.
- narration 전체를 합친 글자 수가 대략 ${TARGET_CHAR_RANGE.min}~${TARGET_CHAR_RANGE.max}자 사이가 되도록
  하세요(전체 낭독 시간 ${TARGET_MIN_SECONDS}~${TARGET_MAX_SECONDS}초 목표, 한국어 기준 초당 약 ${SYLLABLES_PER_SECOND}음절).

${HOOK_TYPE_GUIDE}

${CTA_TYPE_GUIDE}

${RETENTION_GUIDE}
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
