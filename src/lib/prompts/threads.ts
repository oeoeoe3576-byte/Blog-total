// 수정 가이드: 글자 수 제한이나 댓글 개수를 바꾸려면 이 파일만 고치면 된다.

import type { Experience } from "@/lib/types";
import { COMMON_SYSTEM_RULES } from "./common";

export const THREADS_DELIMITERS = {
  main: "===MAIN===",
  reply: "===REPLY===",
} as const;

export const THREADS_MAX_CHARS = 500;

const OUTPUT_FORMAT_GUIDE = `
반드시 아래 형식 그대로, 다른 설명 없이 출력하세요:

${THREADS_DELIMITERS.main}
(메인 포스트. 첫 줄은 강한 후킹 문장으로 시작하세요.)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 1)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 2)
${THREADS_DELIMITERS.reply}
(이어지는 댓글 3)

각 글은 공백 포함 ${THREADS_MAX_CHARS}자를 절대 넘기지 마세요. 짧은 문장 위주로, 줄바꿈을 자주 사용해
후기 게시물처럼 읽히게 쓰세요. 댓글은 최대 3개까지만 쓰고, 더 쓸 내용이 없으면 생략해도 됩니다.
`.trim();

export function buildThreadsSystemPrompt(experience: Experience): string {
  const experienceGuide =
    experience === "experienced"
      ? "이 글은 실제 사용 경험을 바탕으로 합니다. 아래 블로그 글에 있는 경험 범위 안에서만 표현하세요."
      : `이 글은 직접 사용해보지 않은 정보성 글입니다. "써봤다", "사용해보니" 같은 경험 암시 표현을 쓰지 마세요.`;

  return [
    COMMON_SYSTEM_RULES,
    "당신은 Threads(스레드)에 올릴 짧은 후기 게시물을 씁니다.",
    experienceGuide,
    OUTPUT_FORMAT_GUIDE,
  ].join("\n\n");
}

export function buildThreadsUserPrompt(blogBodyMarkdown: string): string {
  return `아래 블로그 글을 참고해서 Threads 게시물로 재구성하세요.\n\n<blog_source>\n${blogBodyMarkdown}\n</blog_source>`;
}
