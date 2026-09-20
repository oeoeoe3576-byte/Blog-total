// LLM이 반환한 텍스트를 구조화된 데이터로 바꾸는 파서 (오류 방지 규칙 7).
// 구분자가 없거나 코드펜스/잡문이 섞여도 절대 예외를 던지지 않는다.

import type { ZodType } from "zod";
import { BLOG_DELIMITERS } from "./prompts/blog";
import { THREADS_DELIMITERS } from "./prompts/threads";

export interface ParsedBlog {
  titles: string[];
  body: string;
  hashtags: string[];
}

export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/);
  if (fenced) return fenced[1].trim();
  return trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
}

function parseTitleLines(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);
}

function parseHashtags(section: string): string[] {
  return Array.from(section.matchAll(/#[^\s#]+/g), (m) => m[0]);
}

export function parseBlogOutput(raw: string): ParsedBlog {
  const text = stripCodeFences(raw);

  const titlesIdx = text.indexOf(BLOG_DELIMITERS.titles);
  const bodyIdx = text.indexOf(BLOG_DELIMITERS.body);
  const tagsIdx = text.indexOf(BLOG_DELIMITERS.tags);

  if (bodyIdx === -1) {
    // 구분자를 전혀 못 찾으면 전체를 본문으로 취급한다.
    return { titles: [], body: text, hashtags: [] };
  }

  const titles =
    titlesIdx !== -1 && titlesIdx < bodyIdx
      ? parseTitleLines(text.slice(titlesIdx + BLOG_DELIMITERS.titles.length, bodyIdx))
      : [];

  const bodyEnd = tagsIdx !== -1 && tagsIdx > bodyIdx ? tagsIdx : text.length;
  const body = text.slice(bodyIdx + BLOG_DELIMITERS.body.length, bodyEnd).trim();

  const hashtags =
    tagsIdx !== -1 ? parseHashtags(text.slice(tagsIdx + BLOG_DELIMITERS.tags.length)) : [];

  return { titles, body, hashtags };
}

export interface ParsedThreads {
  main: string;
  replies: string[];
}

/** 스레드 출력 파서. ===MAIN===/===REPLY=== 구분자가 없어도 죽지 않는다. */
export function parseThreadsOutput(raw: string): ParsedThreads {
  const text = stripCodeFences(raw);
  const mainIdx = text.indexOf(THREADS_DELIMITERS.main);

  if (mainIdx === -1) {
    return { main: text, replies: [] };
  }

  const afterMain = text.slice(mainIdx + THREADS_DELIMITERS.main.length);
  const blocks = afterMain.split(THREADS_DELIMITERS.reply);
  const main = blocks[0]?.trim() ?? "";
  const replies = blocks.slice(1).map((b) => b.trim()).filter(Boolean);

  return { main, replies };
}

export type JsonParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * 코드펜스/잡문이 섞인 JSON 응답을 관대하게 파싱하고 zod로 검증한다.
 * 실패해도 예외를 던지지 않고 { ok: false } 를 반환한다(호출부에서 재시도 여부 판단).
 */
export function parseJsonLenient<T>(raw: string, schema: ZodType<T>): JsonParseResult<T> {
  const text = stripCodeFences(raw);
  const start = text.search(/[[{]/);
  const candidate = start >= 0 ? text.slice(start) : text;

  let json: unknown;
  try {
    json = JSON.parse(candidate);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "JSON 파싱에 실패했어요." };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, data: result.data };
}
