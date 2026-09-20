// LLM JSON 응답 검증용 zod 스키마 모음.

import { z } from "zod";

export const sceneKindSchema = z.enum(["hook", "scene", "cta"]);

export const llmSceneSchema = z.object({
  kind: sceneKindSchema,
  headline: z.string().min(1),
  narration: z.string().min(1),
});

export const scriptResponseSchema = z.object({
  scenes: z.array(llmSceneSchema).min(1),
});

export type ScriptResponse = z.infer<typeof scriptResponseSchema>;
