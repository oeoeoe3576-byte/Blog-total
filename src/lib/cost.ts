// 예상 비용 계산 (대략치). 정확한 과금 대신 사용자가 "대략 얼마인지" 감을 잡도록 돕는다.
// 단가는 설정에서 사용자가 조정할 수 있게 확장할 수 있다(Phase 1에서는 고정값 사용).

export const ROUGH_COST_WON = {
  /** OpenAI(gpt-5-mini)로 블로그 글 1편을 생성할 때의 대략적인 비용(원) */
  textGeneration: 40,
  /** OpenAI(gpt-image) low 화질로 이미지 1장을 생성할 때의 대략적인 비용(원) */
  imageGeneration: 60,
  /** OpenAI TTS로 장면 1개 분량의 더빙을 생성할 때의 대략적인 비용(원) */
  ttsGeneration: 20,
};
