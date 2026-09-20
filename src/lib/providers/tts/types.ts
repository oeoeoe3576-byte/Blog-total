export interface TtsInput {
  text: string;
  voice: string;
  /** 0.9~1.5 범위(clampRate로 보정됨) */
  rate: number;
}

export interface TtsOutput {
  audio: Buffer;
  format: "mp3" | "wav";
}
