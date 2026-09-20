// 수정 가이드: 분량/소제목 개수/출력 구분자를 바꾸고 싶다면 이 파일을 고치면 된다.
// 출력 구분자(===TITLES===/===BODY===/===TAGS===)를 바꾸면 lib/parse.ts의
// BLOG_DELIMITERS도 함께 바꿔야 한다.

import type { Product } from "@/lib/types";
import { COMMON_SYSTEM_RULES, wrapProductInfo } from "./common";

export const BLOG_DELIMITERS = {
  titles: "===TITLES===",
  body: "===BODY===",
  tags: "===TAGS===",
} as const;

const OUTPUT_FORMAT_GUIDE = `
반드시 아래 형식 그대로, 다른 설명 없이 출력하세요(코드블록으로 감싸지 마세요):

${BLOG_DELIMITERS.titles}
1) 제목 후보 1
2) 제목 후보 2
3) 제목 후보 3
${BLOG_DELIMITERS.body}
(소제목 3~5개로 구성된 네이버 블로그 본문. 소제목은 "## "으로 시작하세요.
이미지를 넣을 위치에는 [이미지1: 어떤 장면인지 설명] 형태의 자리표시자를 넣으세요.)
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
대신 특징, 장단점, 이런 분께 추천한다는 식의 정보 전달 톤을 유지하세요.
`.trim();

export function buildBlogSystemPrompt(product: Pick<Product, "experience">): string {
  const experienceGuide =
    product.experience === "experienced" ? EXPERIENCED_GUIDE : RESEARCHED_GUIDE;

  return [
    COMMON_SYSTEM_RULES,
    "당신은 네이버 블로그용 제휴마케팅 후기 글을 작성합니다.",
    experienceGuide,
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
