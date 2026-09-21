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
   (예: "이것저것 찾아보고", "후기 뒤지고", "며칠을 고민하다가"). Hook 다음 2~3문장 안에 이 글이 검색자의
   질문(메인 키워드로 무엇을 찾는지)에 대한 결론이나 핵심 답을 짧게라도 먼저 제시하세요. 결론을 끝까지
   숨기면 이탈률이 올라갑니다.
3. **문제 정의**: 이 카테고리에서 사람들이 헷갈리거나 고민하는 지점을 짧고 명확하게 짚어주세요.
4. **해결/소개**: 상품의 특징을 번호 리스트나 표로 정리하세요. 정보를 나열만 하지 말고 "그래서 뭐가 좋은지"를 붙이세요.
5. **경험 후기**: <experience_notes>가 있을 때만 이 섹션을 포함하세요. 실제 체감, 예상과 달랐던 점, 아쉬웠던 점을
   솔직하게 담되 적힌 내용의 범위 안에서만 쓰세요. 이 노트가 없으면 이 섹션은 생략하고 "이런 분께 추천해요" 섹션으로 대체하세요.
6. **비교·상황별 추천(선택)**: "이런 분이라면 A가, 이런 분이라면 B가 낫다"는 식으로 상황별 추천을 붙이세요. 정보가 부족하면 생략하세요.
7. **마무리 요약 + CTA**: 본문 핵심 내용을 2~3줄로 다시 정리하고(재검색 없이 바로 얻어가는 느낌), 강요하지
   않고 자연스럽게 CTA로 마무리하세요.

이미지를 넣을 위치에는 [이미지1: 어떤 장면인지 설명] 형태의 자리표시자를 넣으세요. 설명 문구에도 메인 키워드나
세부 키워드를 자연스럽게 한 번씩 넣으세요(이미지 대체 텍스트 최적화 효과). 표가 도움이 되는 정보(가격/구성/비교)가
있으면 마크다운 표를 적극 활용하세요.
`.trim();

const SEO_GUIDE = `
**네이버 검색 상위노출을 고려해서 써야 합니다.** 말투만 친근하게 바꾸는 것으로는 부족하고, 아래 구조적
규칙을 반드시 함께 지키세요.

- **세부 키워드(연관 검색어) 만들기**: 메인 키워드 하나만 반복하지 말고, 실제 검색자가 함께 찾을 법한
  세부 키워드 3~5개를 스스로 만들어 자연스럽게 배치하세요(예: 메인 키워드가 "극세사 이불 추천"이라면
  "극세사 이불 세탁 방법", "극세사 이불 가격", "극세사 이불 단점", "이불 커버 세트 추천" 같은 조합).
  이 세부 키워드들은 소제목이나 문단 안에 자연스럽게 하나씩 녹이세요.
- **소제목에도 키워드를 넣으세요**: 소제목 4~6개 중 최소 2~3개에는 메인 키워드 또는 세부 키워드를
  포함하세요. 소제목만 훑어봐도 이 글이 뭘 다루는지 알 수 있어야 합니다.
- **문단은 짧게, 스캔하기 쉽게**: 한 문단은 2~4문장을 넘기지 마세요. 정보량이 많은 부분은 번호 리스트나
  표로 쪼개서 눈으로 빠르게 훑을 수 있게 하세요(체류시간과 가독성을 동시에 잡는 방법입니다).
- **정보의 구체성**: "좋아요", "편해요" 같은 막연한 표현 대신 가능한 구체적인 정보(크기/소재/가격대/
  소요시간/사용 방법 등 실제로 제공된 정보)를 문장에 녹이세요. 구체적일수록 검색 엔진이 실질적인 정보성
  글로 판단합니다.
- **키워드 스터핑 금지**: 메인 키워드를 억지로 반복하면 오히려 스팸으로 분류될 수 있습니다. 자연스러운
  문장 안에서만 등장시키세요.
`.trim();

const OUTPUT_FORMAT_GUIDE = `
반드시 아래 형식 그대로, 다른 설명 없이 출력하세요(코드블록으로 감싸지 마세요):

${BLOG_DELIMITERS.titles}
1) 제목 후보 1 (메인 키워드를 제목 맨 앞이나 앞부분에 배치, 형식: 메인 키워드 핵심 내용 | 부가 정보, 25~40자 내외)
2) 제목 후보 2
3) 제목 후보 3
${BLOG_DELIMITERS.body}
(위 구조 가이드와 SEO 가이드를 따른 네이버 블로그 본문)
${BLOG_DELIMITERS.tags}
(메인 키워드 + 세부 키워드 조합으로 최소 10개, 최대 15개. 예: #메인키워드 #메인키워드추천 #메인키워드가격
#메인키워드후기 #세부키워드1 ... 서로 겹치지 않게 다양한 조합으로 만드세요.)
`.trim();

const LENGTH_GUIDE =
  "본문 분량은 공백 포함 1,800~2,500자를 목표로 하세요. 너무 짧으면 정보성 글로 평가받기 어렵습니다.";

const KEYWORD_GUIDE = (mainKeyword: string) =>
  `메인 키워드 "${mainKeyword}"를 제목 후보 각각의 앞부분에 포함하고, 본문 도입부(첫 문단 안)에도 한 번,
그 외 본문 전체에는 자연스럽게 3~5회 정도 분산해서 배치하세요. 억지로 반복하지 마세요.`;

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
    "당신은 네이버 블로그 검색 상위노출을 목표로 제휴마케팅 후기 글을 작성하는 SEO 라이터입니다.",
    BRAND_VOICE_GUIDE,
    experienceGuide,
    STRUCTURE_GUIDE,
    SEO_GUIDE,
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
