// LLM이 반환한 텍스트를 구조화된 데이터로 바꾸는 파서 (오류 방지 규칙 7).
// 구분자가 없거나 코드펜스/잡문이 섞여도 절대 예외를 던지지 않는다.

import { BLOG_DELIMITERS } from "./prompts/blog";

export interface ParsedBlog {
  titles: string[];
  body: string;
  hashtags: string[];
}

function stripCodeFences(raw: string): string {
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
