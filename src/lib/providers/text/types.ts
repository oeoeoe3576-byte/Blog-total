export interface TextGenInput {
  /** 시스템 프롬프트 (규칙/역할 지시) */
  system: string;
  /** 사용자 프롬프트 (실제 요청 내용) */
  user: string;
  /** true면 JSON 모드로 요청한다(프로바이더가 지원하는 경우) */
  json?: boolean;
  /** 프로바이더별 모델명. 없으면 기본값 사용 */
  model?: string;
}
