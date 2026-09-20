import { describe, expect, it } from "vitest";
import { buildTimeline, chunkText, findActiveScene } from "./timeline";
import type { Scene } from "@/lib/types";

const scenes: Scene[] = [
  { id: "a", kind: "hook", headline: "훅", narration: "안녕하세요 반갑습니다" },
  { id: "b", kind: "scene", headline: "장면", narration: "이건 두번째 장면입니다" },
];

describe("chunkText", () => {
  it("공백 기준으로 최대 길이 내외로 나눈다", () => {
    const chunks = chunkText("가나다 라마바 사아자 차카타 파하가 나다라", 10);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(10 + 4));
  });

  it("빈 문자열은 빈 배열을 반환한다", () => {
    expect(chunkText("")).toEqual([]);
  });
});

describe("buildTimeline", () => {
  it("더빙이 꺼져있으면 글자수 기반으로 장면 길이를 계산한다", () => {
    const timeline = buildTimeline(
      scenes,
      () => undefined,
      () => undefined,
      false,
    );
    expect(timeline.scenes).toHaveLength(2);
    expect(timeline.scenes[0].startTime).toBe(0);
    expect(timeline.scenes[1].startTime).toBe(timeline.scenes[0].duration);
    expect(timeline.totalDuration).toBeGreaterThan(0);
  });

  it("더빙이 켜져있으면 오디오 길이 + 0.3초로 계산한다", () => {
    const audio = { blob: new Blob(["x"]), durationSeconds: 3 };
    const timeline = buildTimeline(
      scenes,
      () => undefined,
      (id) => (id === "a" ? audio : undefined),
      true,
    );
    expect(timeline.scenes[0].duration).toBeCloseTo(3.3, 5);
  });

  it("이미지가 없는 장면도 죽지 않고 hasImage:false로 표시한다", () => {
    const timeline = buildTimeline(
      scenes,
      () => undefined,
      () => undefined,
      false,
    );
    expect(timeline.scenes.every((s) => s.hasImage === false)).toBe(true);
  });
});

describe("findActiveScene", () => {
  it("주어진 시간에 해당하는 장면을 찾는다", () => {
    const timeline = buildTimeline(
      scenes,
      () => undefined,
      () => undefined,
      false,
    );
    const active = findActiveScene(timeline, 0);
    expect(active?.index).toBe(0);

    const secondSceneStart = timeline.scenes[1].startTime + 0.01;
    const active2 = findActiveScene(timeline, secondSceneStart);
    expect(active2?.index).toBe(1);
  });

  it("범위를 넘는 시간은 마지막 장면을 반환한다", () => {
    const timeline = buildTimeline(
      scenes,
      () => undefined,
      () => undefined,
      false,
    );
    const active = findActiveScene(timeline, timeline.totalDuration + 100);
    expect(active?.index).toBe(1);
  });
});
