// 앱 전역 데이터 모델 (PROMPT.md 7. 데이터 모델)

export type Experience = "experienced" | "researched";

export interface Product {
  name: string;
  category?: string;
  features?: string;
  url?: string;
  mainKeyword: string;
  experience: Experience;
  experienceNotes?: string;
}

export interface BlogResult {
  titles: string[];
  selectedTitle: string;
  bodyMarkdown: string;
  hashtags: string[];
  provider?: string;
}

export interface ThreadsResult {
  main: string;
  replies: string[];
  provider?: string;
}

export type SceneKind = "hook" | "scene" | "cta";

export interface Scene {
  id: string;
  kind: SceneKind;
  headline: string;
  narration: string;
  imagePromptKo?: string;
  imagePromptEn?: string;
}

export type SceneImageSource = "product" | "upload" | "stock" | "ai";

export interface SceneImage {
  id: string;
  sceneId: string;
  blobKey: string;
  provider: string;
  source: SceneImageSource;
  used: boolean;
  /** 스톡 이미지 출처 크레딧(작가명 등). 발행 패키지의 credits.txt에 쓰인다. */
  credit?: string;
}

export type ClipStyle = "auto" | "emotional" | "cinematic";
export type TextSize = "small" | "normal" | "large";
export type Resolution = "720p" | "1080p";

export interface TextStyleSettings {
  font: string;
  size: TextSize;
  color: "auto" | string;
  background: "auto" | "none" | string;
}

export interface VideoSettings {
  title: string;
  style: ClipStyle;
  headline: TextStyleSettings;
  sub: TextStyleSettings;
  dubbing: boolean;
  voice: string;
  rate: number; // 0.9 ~ 1.5
  resolution: Resolution;
}
