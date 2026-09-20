// 데모 모드용 샘플 데이터. API 키 없이 전체 파이프라인을 검증하는 용도다(PROMPT.md 11절).

import type { Product, Scene } from "@/lib/types";
import { ASPECT_RATIO, type Aspect } from "@/lib/imageUtils";

const GRADIENT_PALETTE: [string, string][] = [
  ["#f97316", "#facc15"],
  ["#06b6d4", "#3b82f6"],
  ["#ec4899", "#8b5cf6"],
  ["#22c55e", "#84cc16"],
  ["#f43f5e", "#f97316"],
];

function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

/** 데모 모드용 그라데이션 샘플 이미지를 캔버스로 그린다(API 호출 없이 렌더링 엔진 검증용). */
export async function generateDemoImageBlob(label: string, aspect: Aspect): Promise<Blob> {
  const ratio = ASPECT_RATIO[aspect];
  const longSide = 800;
  const width = ratio >= 1 ? longSide : Math.round(longSide * ratio);
  const height = ratio >= 1 ? Math.round(longSide / ratio) : longSide;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");

  const [c1, c2] = GRADIENT_PALETTE[hashString(label) % GRADIENT_PALETTE.length];
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(1, c2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = label.length > 20 ? label.slice(0, 20) + "…" : label;
  ctx.fillText(text, width / 2, height / 2, width - 40);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("데모 이미지 생성에 실패했어요."))),
      "image/jpeg",
      0.9,
    );
  });
}

export const DEMO_PRODUCT: Product = {
  name: "포근한 극세사 극세사 이불 세트",
  category: "침구/이불",
  features: "사계절용, 극세사 원단, 세탁기 세탁 가능, 정전기 방지 가공",
  mainKeyword: "극세사 이불 추천",
  experience: "experienced",
  experienceNotes:
    "환절기에 이불이 얇아서 새로 샀다. 배송은 이틀 걸렸고, 촉감이 부드러워서 아이가 좋아한다. 세탁 후에도 뭉치지 않았다. 다만 이불 커버 지퍼가 조금 뻑뻑한 편이었다.",
};

export const DEMO_BLOG_RAW = `
===TITLES===
1) 환절기 필수템, 극세사 이불 세트 솔직 후기
2) 극세사 이불 추천 - 아이도 좋아하는 포근함
3) 세탁해도 안 뭉치는 극세사 이불, 직접 써본 후기
===BODY===
## 환절기에 이불 바꾼 이유
날씨가 쌀쌀해지면서 기존 이불이 너무 얇게 느껴져서 극세사 이불 추천을 검색하다가 이 제품을 골랐어요.

[이미지1: 포장을 개봉한 이불 세트 전체 컷]

## 배송과 첫 개봉 느낌
주문 후 이틀 만에 도착했고, 개봉하자마자 극세사 특유의 부드러운 촉감이 느껴졌어요.

## 실제 사용 후기
아이가 이불을 만지자마자 좋아했고, 정전기도 크게 느껴지지 않았어요. 세탁기로 한 번 빨아봤는데 뭉치지 않고 결이 그대로 유지됐어요.

[이미지2: 세탁 후 보송한 이불 클로즈업]

## 아쉬웠던 점
이불 커버 지퍼가 조금 뻑뻑한 편이라 여닫을 때 살짝 힘이 필요했어요.

## 이런 분께 추천해요
환절기 이불을 찾고 있거나, 아이 방 침구를 부드러운 소재로 바꾸고 싶은 분께 추천드려요.
===TAGS===
#극세사이불 #이불추천 #환절기침구 #극세사이불세트 #아이방침구
`.trim();

export const DEMO_THREADS_RAW = `
===MAIN===
환절기에 이불 뭐 쓰세요? 저는 극세사 이불로 바꿨어요 🧺

이틀 만에 도착해서
바로 세탁 한 번 돌리고 덮었는데
결이 안 뭉치고 그대로예요

아이도 촉감 좋다고 계속 만지작거리네요
===REPLY===
지퍼가 살짝 뻑뻑한 거 빼고는 만족도 높아요.
환절기 이불 고민이면 한 번쯤 볼만해요.
===REPLY===
자세한 후기는 프로필/댓글의 링크에서 확인해보세요!
`.trim();

export const DEMO_SCENES: Scene[] = [
  {
    id: "s1",
    kind: "hook",
    headline: "[[환절기]] 이불 고민 끝",
    narration: "이불이 너무 얇아서 매년 환절기마다 뒤척였는데, 이번엔 다르게 골라봤어요.",
  },
  {
    id: "s2",
    kind: "scene",
    headline: "이 제품을 고른 이유",
    narration: "극세사 원단에 세탁기 세탁까지 가능하다길래 검색 끝에 골랐어요.",
  },
  {
    id: "s3",
    kind: "scene",
    headline: "이불 세트 구성",
    narration: "이불 하나에 커버까지 세트로 와서 바로 덮을 수 있었어요.",
  },
  {
    id: "s4",
    kind: "scene",
    headline: "[[촉감]] 완전 부드러움",
    narration: "개봉하자마자 부드러운 촉감이 느껴졌고, 아이도 좋아했어요.",
  },
  {
    id: "s5",
    kind: "scene",
    headline: "솔직히 아쉬운 점",
    narration: "다만 커버 지퍼가 조금 뻑뻑한 편이라 여닫을 때 힘이 좀 필요해요.",
  },
  {
    id: "s6",
    kind: "cta",
    headline: "자세한 후기는 [[링크]]에서",
    narration: "더 자세한 내용은 프로필이나 댓글의 링크에서 확인해보세요.",
  },
];
