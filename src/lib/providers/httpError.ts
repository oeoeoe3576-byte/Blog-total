import type { ErrorKind } from "./types";

/** HTTP 상태 코드만으로 대략적인 오류 종류를 분류한다(프로바이더별 세부 분류가 필요 없을 때 사용). */
export function classifyHttpStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return "AUTH";
  if (status === 429) return "QUOTA";
  if (status === 400) return "BAD_RESPONSE";
  if (status >= 500) return "NETWORK";
  return "UNKNOWN";
}
