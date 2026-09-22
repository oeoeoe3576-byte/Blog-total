export interface TextGenInput {
  /** 시스템 프롬프트 (규칙/역할 지시) */
  system: string;
  /** 사용자 프롬프트 (실제 요청 내용) */
  user: string;
  /** true면 JSON 모드로 요청한다(프로바이더가 지원하는 경우) */
  json?: boolean;
  /** 프로바이더별 모델명. 없으면 기본값 사용 */
  model?: string;
  /** true면 (지원하는 프로바이더에 한해) 실시간 웹 검색으로 실제 상품 정보를 찾아 참고하게 한다 */
  grounding?: boolean;
}
