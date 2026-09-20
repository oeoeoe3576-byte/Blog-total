import { describe, expect, it } from "vitest";
import { parseHeadlineSegments, stripHeadlineMarkup } from "./textLayout";

describe("parseHeadlineSegments", () => {
  it("[[강조]] 마크업을 강조 세그먼트로 분리한다", () => {
    const segments = parseHeadlineSegments("이건 [[핵심어]]예요");
    expect(segments).toEqual([
      { text: "이건 ", emphasis: false },
      { text: "핵심어", emphasis: true },
      { text: "예요", emphasis: false },
    ]);
  });

  it("마크업이 없으면 전체를 하나의 비강조 세그먼트로 반환한다", () => {
    expect(parseHeadlineSegments("그냥 텍스트")).toEqual([
      { text: "그냥 텍스트", emphasis: false },
    ]);
  });

  it("마크업이 여러 개여도 모두 분리한다", () => {
    const segments = parseHeadlineSegments("[[A]]와 [[B]]");
    expect(segments.filter((s) => s.emphasis).map((s) => s.text)).toEqual(["A", "B"]);
  });
});

describe("stripHeadlineMarkup", () => {
  it("[[ ]] 기호를 제거하고 내용만 남긴다", () => {
    expect(stripHeadlineMarkup("이건 [[핵심어]]예요")).toBe("이건 핵심어예요");
  });
});
