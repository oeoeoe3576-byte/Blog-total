// 수정 가이드: 글자 수 제한이나 댓글 개수를 바꾸려면 이 파일만 고치면 된다.

import type { Experience } from "@/lib/types";
import { BRAND_VOICE_GUIDE, COMMON_SYSTEM_RULES } from "./common";

export const THREADS_DELIMITERS = {
  main: "===MAIN===",
  reply: "===REPLY===",
} as const;

export const THREADS_MAX_CHARS = 500;

const OUTPUT_FORMAT_GUIDE = `
반드시 아래 형식 그대로, 다른 설명 없이 출력하세요:

${THREADS_DELIMITERS.main}
(메인 포스트. 첫 줄은 강한 후킹 문장 하나로 끊고, 그다음 줄을 띄우세요.)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 1)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 2)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 3)

**Threads는 블로그보다 훨씬 압축적이고 리듬감 있게 쓰세요.**
- 한 문장 = 한 줄. 문장마다 줄바꿈하세요. 긴 문장을 쓰지 마세요.
- 메인 포스트는 "후킹 한 줄 → 공감/상황 2~3줄 → 짧은 결론 한 줄" 흐름으로 구성하세요.
- 감정 표현(ㅋㅋ, ㅠ, !! 등)을 블로그보다 더 적극적으로 써서 진짜 후기 게시물처럼 보이게 하세요.
- 댓글 1~2개는 솔직한 디테일(아쉬운 점, 팁)을, 마지막 댓글은 "자세한 후기는 프로필/댓글의 링크에서" 식으로 안내하세요.
- 각 글은 공백 포함 ${THREADS_MAX_CHARS}자를 절대 넘기지 마세요. 댓글은 최대 3개까지만 쓰고, 더 쓸 내용이 없으면 생략해도 됩니다.
`.trim();

export function buildThreadsSystemPrompt(experience: Experience): string {
  const experienceGuide =
    experience === "experienced"
      ? "이 글은 실제 사용 경험을 바탕으로 합니다. 아래 블로그 글에 있는 경험 범위 안에서만 표현하세요."
      : `이 글은 직접 사용해보지 않은 정보성 글입니다. "써봤다", "사용해보니" 같은 경험 암시 표현을 쓰지 마세요.`;

  return [
    COMMON_SYSTEM_RULES,
    "당신은 Threads(스레드)에 올릴 짧은 후기 게시물을 씁니다.",
    BRAND_VOICE_GUIDE,
    experienceGuide,
    OUTPUT_FORMAT_GUIDE,
  ].join("\n\n");
}

export function buildThreadsUserPrompt(blogBodyMarkdown: string): string {
  return `아래 블로그 글을 참고해서 Threads 게시물로 재구성하세요.\n\n<blog_source>\n${blogBodyMarkdown}\n</blog_source>`;
}
