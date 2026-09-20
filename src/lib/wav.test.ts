import { describe, expect, it } from "vitest";
import { pcmToWav } from "./wav";

describe("pcmToWav", () => {
  it("올바른 RIFF/WAVE 헤더를 붙인다", () => {
    const pcm = Buffer.from(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    const wav = pcmToWav(pcm, { sampleRate: 24000, bitsPerSample: 16, channels: 1 });

    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");

    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length);
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // data size
  });

  it("원본 PCM 바이트를 그대로 뒤에 붙인다", () => {
    const pcm = Buffer.from(new Uint8Array([9, 8, 7, 6]));
    const wav = pcmToWav(pcm);
    expect(wav.subarray(44)).toEqual(pcm);
  });
});
