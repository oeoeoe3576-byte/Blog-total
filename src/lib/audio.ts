// 오디오 길이 측정. AudioContext 없이 <audio> 엘리먼트 메타데이터만 읽으므로
// 사용자 클릭 제스처 없이도(자동재생 정책과 무관하게) 호출할 수 있다.
export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("오디오 길이를 읽지 못했어요."));
    };
    audio.src = url;
  });
}
