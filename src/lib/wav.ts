// Gemini TTS는 헤더 없는 raw PCM(24kHz, 16bit, mono)을 반환한다(오류 방지 규칙 9).
// 브라우저 decodeAudioData가 읽을 수 있도록 WAV(RIFF) 헤더를 붙인다.

export interface PcmFormat {
  sampleRate: number;
  bitsPerSample: number;
  channels: number;
}

export const GEMINI_PCM_FORMAT: PcmFormat = { sampleRate: 24000, bitsPerSample: 16, channels: 1 };

export function pcmToWav(pcm: Buffer, format: PcmFormat = GEMINI_PCM_FORMAT): Buffer {
  const { sampleRate, bitsPerSample, channels } = format;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt 청크 길이(PCM은 16)
  header.writeUInt16LE(1, 20); // 오디오 포맷: 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}
