// Edge TTS(msedge-tts, 비공식) 어댑터. 문서: 설치된 msedge-tts@2.0.7 타입 선언 기준.
// 비공식 API라 언제든 막힐 수 있으므로 실패는 정상 시나리오로 취급하고 다음 체인으로 넘긴다.

import type { Readable } from "node:stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { ProviderAdapter } from "../types";
import { ProviderError } from "../types";
import { TTS_PROVIDER_META } from "./meta";
import type { TtsInput, TtsOutput } from "./types";

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export const edgeTtsAdapter: ProviderAdapter<TtsInput, TtsOutput> = {
  meta: TTS_PROVIDER_META.edge,

  isAvailable: () => true,

  run: async (input) => {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(input.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(input.text, { rate: input.rate });
      const audio = await streamToBuffer(audioStream);
      tts.close();

      if (audio.length === 0) {
        throw new ProviderError("BAD_RESPONSE", "edge", "Edge TTS가 빈 오디오를 반환했어요.");
      }
      return { audio, format: "mp3" };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(
        "NETWORK",
        "edge",
        err instanceof Error ? err.message : "Edge TTS 연결에 실패했어요(비공식 API라 막혔을 수 있어요).",
      );
    }
  },
};
