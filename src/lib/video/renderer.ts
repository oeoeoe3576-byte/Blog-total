// 공용 프레임 렌더러. 미리보기와 녹화 양쪽에서 이 drawFrame()을 그대로 호출한다(PROMPT.md 9-2절).

import type { Resolution, TextStyleSettings, VideoSettings } from "@/lib/types";
import { findActiveScene, CROSSFADE_SECONDS, activeNarrationChunk, type Timeline } from "./timeline";
import { fitTextToLines, stripHeadlineMarkup, type HeadlineSegment } from "./textLayout";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractKeywords(headline: string): string[] {
  return Array.from(headline.matchAll(/\[\[(.+?)\]\]/g), (m) => m[1]);
}

/** 줄바꿈된 한 줄 안에서 원본 헤드라인의 [[강조]] 키워드가 등장하는 부분만 강조 표시한다. */
function highlightLine(line: string, keywords: string[]): HeadlineSegment[] {
  if (keywords.length === 0) return [{ text: line, emphasis: false }];
  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "g");
  return line
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, emphasis: keywords.includes(part) }));
}

export const RESOLUTION_SIZES: Record<Resolution, { width: number; height: number }> = {
  "720p": { width: 720, height: 1280 },
  "1080p": { width: 1080, height: 1920 },
};

export const FONT_FALLBACK = '"Noto Sans KR", sans-serif';

export type ResolvedStyle = "emotional" | "cinematic";

export interface RenderSettings extends Omit<VideoSettings, "style"> {
  style: ResolvedStyle;
}

export function resolveStyle(style: VideoSettings["style"], isExperienced: boolean): ResolvedStyle {
  if (style === "auto") return isExperienced ? "emotional" : "cinematic";
  return style;
}

function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

const FALLBACK_PALETTE: [string, string][] = [
  ["#f97316", "#facc15"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#22c55e", "#84cc16"],
];

function drawGradientFallback(ctx: CanvasRenderingContext2D, width: number, height: number, seed: string) {
  const [c1, c2] = FALLBACK_PALETTE[hashString(seed) % FALLBACK_PALETTE.length];
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  scale: number,
  panX: number,
  panY: number,
) {
  const bitmapRatio = bitmap.width / bitmap.height;
  const canvasRatio = width / height;

  let drawW: number;
  let drawH: number;
  if (bitmapRatio > canvasRatio) {
    drawH = height * scale;
    drawW = drawH * bitmapRatio;
  } else {
    drawW = width * scale;
    drawH = drawW / bitmapRatio;
  }

  const baseX = (width - drawW) / 2;
  const baseY = (height - drawH) / 2;
  const dx = baseX + panX * width;
  const dy = baseY + panY * height;
  ctx.drawImage(bitmap, dx, dy, drawW, drawH);
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    height * 0.75,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** 켄 번스 모션 + 톤 오버레이가 적용된 배경을 그린다. */
function drawSceneBackground(
  ctx: CanvasRenderingContext2D,
  images: Map<string, ImageBitmap>,
  imageBlobKey: string | undefined,
  sceneId: string,
  index: number,
  localT: number,
  duration: number,
  style: ResolvedStyle,
  width: number,
  height: number,
) {
  const progress = duration > 0 ? Math.min(1, Math.max(0, localT / duration)) : 0;
  const eased = easeInOutQuad(progress);
  const bitmap = imageBlobKey ? images.get(imageBlobKey) : undefined;

  // 이미지가 없거나(디코딩 실패 등으로) 그리다가 예외가 나면 그라데이션으로 폴백한다.
  // ImageBitmap은 드물게 detach될 수 있어(예: 브라우저 메모리 회수) 방어적으로 처리한다.
  let drewImage = false;
  if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
    try {
      drawBitmapWithMotion(ctx, bitmap, index, eased, width, height);
      drewImage = true;
    } catch {
      drewImage = false;
    }
  }

  if (!drewImage) {
    drawGradientFallback(ctx, width, height, sceneId);
  }

  if (style === "emotional") {
    ctx.fillStyle = "rgba(255,170,110,0.12)";
    ctx.fillRect(0, 0, width, height);
  } else {
    drawVignette(ctx, width, height);
  }
}

function drawBitmapWithMotion(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  index: number,
  eased: number,
  width: number,
  height: number,
) {
  const isHero = index === 0;
  let scale: number;
  let panX = 0;
  const panY = 0;

  if (isHero) {
    scale = 1.0 + 0.25 * eased;
  } else {
    switch (index % 4) {
      case 0:
        scale = 1.0 + 0.12 * eased;
        break;
      case 1:
        scale = 1.12 - 0.12 * eased;
        break;
      case 2:
        scale = 1.12;
        panX = -0.06 * eased;
        break;
      default:
        scale = 1.12;
        panX = 0.06 * eased;
    }
  }

  drawCoverImage(ctx, bitmap, width, height, scale, panX, panY);
}

function fontStackFor(family: string): string {
  return `"${family}", ${FONT_FALLBACK}`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerY: number,
  width: number,
  fontPx: number,
  style: TextStyleSettings,
  autoColorSegments: HeadlineSegment[][] | null,
) {
  const lineHeight = fontPx * 1.35;
  const totalHeight = lines.length * lineHeight;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  const color = style.color === "auto" ? "#ffffff" : style.color;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    const textWidth = ctx.measureText(line).width;

    if (style.background !== "none") {
      const paddingX = fontPx * 0.5;
      const paddingY = fontPx * 0.28;
      const boxW = textWidth + paddingX * 2;
      const boxH = fontPx + paddingY * 2;
      ctx.fillStyle =
        style.background === "auto" ? "rgba(0,0,0,0.45)" : style.background;
      roundedRect(ctx, width / 2 - boxW / 2, y - boxH / 2, boxW, boxH, boxH / 3);
      ctx.fill();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, fontPx * 0.08);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = fontPx * 0.15;

    const segments = autoColorSegments?.[i];
    if (segments && style.color === "auto") {
      let cursor = width / 2 - textWidth / 2;
      for (const seg of segments) {
        ctx.fillStyle = seg.emphasis ? "#facc15" : color;
        ctx.textAlign = "left";
        ctx.strokeText(seg.text, cursor, y);
        ctx.fillText(seg.text, cursor, y);
        cursor += ctx.measureText(seg.text).width;
      }
      ctx.textAlign = "center";
    } else {
      ctx.fillStyle = color;
      ctx.strokeText(line, width / 2, y);
      ctx.fillText(line, width / 2, y);
    }

    ctx.shadowBlur = 0;
  });
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  timeline: Timeline,
  t: number,
  settings: RenderSettings,
  images: Map<string, ImageBitmap>,
): void {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, height);

  const active = findActiveScene(timeline, t);
  if (!active) return;

  const { scene: current, localT, index } = active;
  const prev = index > 0 ? timeline.scenes[index - 1] : null;

  if (prev && localT < CROSSFADE_SECONDS) {
    drawSceneBackground(
      ctx,
      images,
      prev.imageBlobKey,
      prev.scene.id,
      index - 1,
      prev.duration,
      prev.duration,
      settings.style,
      width,
      height,
    );
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, localT / CROSSFADE_SECONDS));
    drawSceneBackground(
      ctx,
      images,
      current.imageBlobKey,
      current.scene.id,
      index,
      localT,
      current.duration,
      settings.style,
      width,
      height,
    );
    ctx.restore();
  } else {
    drawSceneBackground(
      ctx,
      images,
      current.imageBlobKey,
      current.scene.id,
      index,
      localT,
      current.duration,
      settings.style,
      width,
      height,
    );
  }

  const safeMargin = width * 0.08;
  const contentWidth = width - safeMargin * 2;

  // 상단 영상 제목
  if (settings.title) {
    ctx.font = `700 ${Math.round(width * 0.045)}px ${fontStackFor("Pretendard")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.fillText(settings.title, width / 2, height * 0.06, contentWidth);
    ctx.shadowBlur = 0;
  }

  // 가운데 큰 자막(헤드라인)
  const headlineFontBase = width * (settings.headline.size === "large" ? 0.078 : settings.headline.size === "small" ? 0.052 : 0.065);
  const headlinePlain = stripHeadlineMarkup(current.scene.headline);
  const { lines: headlineLines, fontPx: headlineFontPx } = fitTextToLines(
    ctx,
    headlinePlain,
    contentWidth,
    2,
    headlineFontBase,
    settings.headline.font,
  );

  const headlineKeywords = extractKeywords(current.scene.headline);
  const headlineSegmentsPerLine =
    settings.headline.color === "auto"
      ? headlineLines.map((line) => highlightLine(line, headlineKeywords))
      : null;

  ctx.font = `700 ${headlineFontPx}px ${fontStackFor(settings.headline.font)}`;
  drawTextBlock(ctx, headlineLines, height * 0.45, width, headlineFontPx, settings.headline, headlineSegmentsPerLine);

  // 아래 내레이션 자막
  const narrationText = activeNarrationChunk(current, localT);
  if (narrationText) {
    const subFontBase = width * (settings.sub.size === "large" ? 0.045 : settings.sub.size === "small" ? 0.032 : 0.038);
    const { lines: subLines, fontPx: subFontPx } = fitTextToLines(
      ctx,
      narrationText,
      contentWidth,
      2,
      subFontBase,
      settings.sub.font,
    );
    ctx.font = `600 ${subFontPx}px ${fontStackFor(settings.sub.font)}`;
    drawTextBlock(ctx, subLines, height * 0.77, width, subFontPx, settings.sub, null);
  }
}

export const FONT_LIST = ["Pretendard", "Noto Sans KR", "Black Han Sans", "Do Hyeon", "Gowun Dodum", "Gowun Batang"];

/** 렌더링에 쓰는 모든 폰트를 미리 로드한다(오류 방지 규칙 6). */
export async function ensureFontsLoaded(): Promise<void> {
  const weights = ["400 32px", "600 32px", "700 32px"];
  await Promise.all(
    FONT_LIST.flatMap((font) => weights.map((w) => document.fonts.load(`${w} "${font}"`))),
  );
}
