// 수정 가이드: 이미지 스타일(조명, 배경, 금지 요소)을 바꾸려면 이 파일만 고치면 된다.

import type { Scene } from "@/lib/types";
import { COMMON_SYSTEM_RULES } from "./common";

const STYLE_GUIDE = `
- 실사(포토리얼) 라이프스타일 사진 스타일, 화사한 주간 하이키 조명, 깔끔한 배경.
  절대 애니메이션/일러스트/카툰/3D 렌더링 스타일로 묘사하지 마세요. 반드시 "photo, photorealistic" 계열
  스타일 키워드를 영어 프롬프트에 포함하고, "anime, illustration, cartoon, 3d render, painting" 은
  명시적으로 피하도록 영어 프롬프트에 "not anime, not illustration" 같은 표현을 넣어 강조하세요.
- 글자·로고·브랜드명·아이콘·화살표·그래픽 기호는 절대 넣지 마세요. 간판·표지판·포스터·메뉴판처럼 배경에
  읽을 수 있는 글자가 우연히 나올 수 있는 소재(상점가, 광고판 등)도 가능하면 피하고, 자연 풍경·사물·인물
  행동 위주로 구성하세요(AI 이미지 모델은 글자를 그릴 때 깨진 글자를 만드는 경우가 많습니다).
- 자막의 [[강조]] 표시(이중 대괄호)는 화면 자막용 문법일 뿐 이미지 내용이 아닙니다. 프롬프트를 만들 때
  대괄호와 그 기호 자체는 완전히 무시하고, 안에 있는 단어의 "의미"만 참고하세요.
- **가장 중요한 규칙: 이미지는 반드시 그 장면의 자막(headline)과 내레이션(narration)에 등장하는
  구체적인 장소·사물·행동을 그대로 시각화해야 합니다.** 내용과 무관한 인물 클로즈업이나 추상적인 감정
  이미지로 때우지 마세요. 예를 들어 내레이션이 "부산에서 배 타고 대마도 가는 길"이라면 페리를 타는 모습이나
  항구, 배 안 풍경처럼 실제로 언급된 장소/사물을 그리세요. "여행 가고 싶은 기분" 같은 막연한 느낌으로
  대체하지 마세요.
- 사람이 반드시 필요한 장면(예: 실제 사용 후기, 손으로 무언가를 만지는 장면)이 아니라면 인물 없이 장소/사물/
  풍경 위주로 구성하세요. 인물이 꼭 필요하면 한국인, 대략적인 연령대, 그리고 무엇을 하고 있는지(행동)까지
  구체적으로 명시하세요. 이유 없이 얼굴 클로즈업 인물 사진을 넣지 마세요.
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
- "en"은 항상 "Photo of" 또는 "Photorealistic photo of"로 시작해서 구체적인 피사체를 바로 이어 쓰세요.
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
