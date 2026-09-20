// Gemini/OpenAI의 SSE(Server-Sent Events) 스트림을 "순수 텍스트 청크" 스트림으로 변환한다.
// 두 프로바이더 모두 `data: {...}\n\n` 형태의 이벤트를 보내므로 파싱 로직을 공유한다.

/**
 * @param body 프로바이더 응답의 원본 body 스트림
 * @param extractText 프로바이더별 JSON 청크에서 텍스트 조각을 뽑아내는 함수
 */
export function sseToTextStream(
  body: ReadableStream<Uint8Array>,
  extractText: (json: unknown) => string,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      // 마지막 조각은 아직 이벤트 경계가 확정되지 않았을 수 있으니 버퍼에 남긴다.
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice("data:".length).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const json = JSON.parse(payload);
            const text = extractText(json);
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // 파싱 실패한 청크는 무시하고 스트림은 계속 진행한다.
          }
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
