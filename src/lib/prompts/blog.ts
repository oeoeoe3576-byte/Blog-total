// 수정 가이드: 분량/소제목 개수/출력 구분자를 바꾸고 싶다면 이 파일을 고치면 된다.
// 출력 구분자(===TITLES===/===BODY===/===TAGS===)를 바꾸면 lib/parse.ts의
// BLOG_DELIMITERS도 함께 바꿔야 한다.

import type { Product } from "@/lib/types";
import { BRAND_VOICE_GUIDE, COMMON_SYSTEM_RULES, wrapProductInfo } from "./common";

export const BLOG_DELIMITERS = {
  titles: "===TITLES===",
  body: "===BODY===",
  tags: "===TAGS===",
} as const;

const STRUCTURE_GUIDE = `
아래 구조(Hook → 인트로/공감 → 문제 정의 → 해결/소개 → 경험 후기 → 비교·추천 → CTA)를 따라 소제목 4~6개로 구성하세요.
소제목은 "## "으로 시작하고, 구조 이름을 그대로 소제목에 쓰지 말고 자연스러운 문장형 소제목으로 바꾸세요.

1. **Hook(첫 문장)**: 정보를 바로 주지 말고 아래 세 유형 중 주제에 맞는 것으로 시작하세요.
   - 질문형: 독자가 검색하며 품었을 의문을 그대로 꺼낸다 (예: "이거 어떻게 골라야 하는지 헷갈리셨죠?")
   - 공감형: 처음이면 당황할 상황을 먼저 제시한다 (예: "이거 고르실 때 다들 한 번씩 고민하실 거예요.")
   - 발견/후회형: "왜 이제서야 알았지" 감성으로 시작한다
2. **인트로**: 짧게 인사하고, 독자가 이 상품/서비스를 찾아보게 된 상황을 구체적인 행동 묘사로 공감시키세요
   (예: "이것저것 찾아보고", "후기 뒤지고", "며칠을 고민하다가").
3. **문제 정의**: 이 카테고리에서 사람들이 헷갈리거나 고민하는 지점을 짧고 명확하게 짚어주세요.
4. **해결/소개**: 상품의 특징을 번호 리스트나 표로 정리하세요. 정보를 나열만 하지 말고 "그래서 뭐가 좋은지"를 붙이세요.
5. **경험 후기**: <experience_notes>가 있을 때만 이 섹션을 포함하세요. 실제 체감, 예상과 달랐던 점, 아쉬웠던 점을
   솔직하게 담되 적힌 내용의 범위 안에서만 쓰세요. 이 노트가 없으면 이 섹션은 생략하고 "이런 분께 추천해요" 섹션으로 대체하세요.
6. **비교·상황별 추천(선택)**: "이런 분이라면 A가, 이런 분이라면 B가 낫다"는 식으로 상황별 추천을 붙이세요. 정보가 부족하면 생략하세요.
7. **CTA(마무리)**: 강요하지 않고 자연스럽게 요약하며 마무리하세요.

이미지를 넣을 위치에는 [이미지1: 어떤 장면인지 설명] 형태의 자리표시자를 넣으세요. 표가 도움이 되는 정보(가격/구성/비교)가
있으면 마크다운 표를 적극 활용하세요.
`.trim();

const OUTPUT_FORMAT_GUIDE = `
반드시 아래 형식 그대로, 다른 설명 없이 출력하세요(코드블록으로 감싸지 마세요):

${BLOG_DELIMITERS.titles}
1) 제목 후보 1 (형식: [핵심어] 핵심 내용 | 부가 정보)
2) 제목 후보 2
3) 제목 후보 3
${BLOG_DELIMITERS.body}
(위 구조 가이드를 따른 네이버 블로그 본문)
${BLOG_DELIMITERS.tags}
#태그1 #태그2 #태그3 #태그4 #태그5
`.trim();

const LENGTH_GUIDE = "본문 분량은 공백 포함 1,500~2,500자를 목표로 하세요.";

const KEYWORD_GUIDE = (mainKeyword: string) =>
  `메인 키워드 "${mainKeyword}"를 제목 후보 각각에 포함하고, 본문에도 자연스럽게 3~5회 정도 분산해서 배치하세요. 억지로 반복하지 마세요.`;

const EXPERIENCED_GUIDE = `
이 글은 "직접 사용해본 사람"의 후기입니다. 사용자가 <experience_notes>에 적은 내용만을 근거로
자연스러운 후기 문장으로 풀어 쓰세요. 적히지 않은 디테일(예: 특정 날짜, 구체적 수치, 다른 사용 상황)은
지어내지 말고, 적힌 내용의 범위 안에서만 표현을 풍부하게 다듬으세요.
`.trim();

const RESEARCHED_GUIDE = `
이 글은 "직접 사용해보지 않고" 상품 정보를 바탕으로 정리한 정보/비교성 글입니다.
"제가 써보니", "사용해보니" 같은 직접 경험을 암시하는 표현을 절대 쓰지 마세요.
대신 "찾아보니", "알아보니" 같은 표현으로 발품 팔아 정리해준 느낌을 살리고, 특징·장단점·이런 분께 추천한다는
정보 전달 톤을 유지하세요. 경험담이 아니어도 문장 리듬과 구어체 어미는 그대로 유지하세요.
`.trim();

export function buildBlogSystemPrompt(product: Pick<Product, "experience">): string {
  const experienceGuide =
    product.experience === "experienced" ? EXPERIENCED_GUIDE : RESEARCHED_GUIDE;

  return [
    COMMON_SYSTEM_RULES,
    "당신은 네이버 블로그용 제휴마케팅 후기 글을 작성합니다.",
    BRAND_VOICE_GUIDE,
    experienceGuide,
    STRUCTURE_GUIDE,
    LENGTH_GUIDE,
    OUTPUT_FORMAT_GUIDE,
  ].join("\n\n");
}

export function buildBlogUserPrompt(product: Product): string {
  const info = [
    `상품명: ${product.name}`,
    product.category ? `카테고리: ${product.category}` : null,
    product.features ? `특징/설명: ${product.features}` : null,
    `메인 키워드: ${product.mainKeyword}`,
  ]
    .filter(Boolean)
    .join("\n");

  const parts = [wrapProductInfo(info), KEYWORD_GUIDE(product.mainKeyword)];

  if (product.experience === "experienced" && product.experienceNotes) {
    parts.push(`<experience_notes>\n${product.experienceNotes}\n</experience_notes>`);
  }

  return parts.join("\n\n");
}
