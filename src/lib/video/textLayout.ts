// 캔버스 텍스트 줄바꿈. ctx.measureText로 폭을 재고 공백 단위 우선,
// 공백이 없거나 한 단어가 너무 길면 글자 단위로 분할한다(PROMPT.md 9-2절).

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  const splitLongWord = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const candidate = chunk + ch;
      if (chunk && ctx.measureText(candidate).width > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = candidate;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    if (ctx.measureText(word).width > maxWidth) {
      splitLongWord(word);
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

export interface FitResult {
  lines: string[];
  fontPx: number;
}

/** 최대 줄 수를 넘으면 폰트 크기를 2px씩 줄여가며 다시 계산한다. */
export function fitTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  baseFontPx: number,
  fontFamily: string,
  minFontPx = 16,
): FitResult {
  let fontPx = baseFontPx;
  while (fontPx >= minFontPx) {
    ctx.font = `700 ${fontPx}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { lines, fontPx };
    fontPx -= 2;
  }
  ctx.font = `700 ${minFontPx}px ${fontFamily}`;
  return { lines: wrapText(ctx, text, maxWidth).slice(0, maxLines), fontPx: minFontPx };
}

export interface HeadlineSegment {
  text: string;
  emphasis: boolean;
}

/** "[[핵심어]]" 마크업을 강조 세그먼트로 분리한다. */
export function parseHeadlineSegments(headline: string): HeadlineSegment[] {
  const segments: HeadlineSegment[] = [];
  const regex = /\[\[(.+?)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(headline)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: headline.slice(lastIndex, match.index), emphasis: false });
    }
    segments.push({ text: match[1], emphasis: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < headline.length) {
    segments.push({ text: headline.slice(lastIndex), emphasis: false });
  }
  return segments.length > 0 ? segments : [{ text: headline, emphasis: false }];
}

/** 강조 마크업을 제거한 순수 텍스트(줄바꿈 계산용). */
export function stripHeadlineMarkup(headline: string): string {
  return headline.replace(/\[\[(.+?)\]\]/g, "$1");
}
