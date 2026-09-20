// 앱 전역 상태 (zustand). PROMPT.md 7절: "상태 전체는 store.ts 하나에서 관리".
//
// 텍스트/설정 상태만 localStorage에 저장한다(용량 5MB 한도, 규칙 4).
// 이미지/오디오/영상 Blob은 lib/storage.ts(IndexedDB)에 키만 저장하고 여기 상태에는
// blobKey 문자열만 둔다.
//
// SSR/하이드레이션 오류 방지(규칙 3): persist는 skipHydration으로 만들고,
// 클라이언트 마운트 후 useHydrateStore()에서 명시적으로 rehydrate 한다.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ApiKeys } from "./providers/types";
import type { BlogResult, Product, Scene, SceneImage, ThreadsResult } from "./types";

export interface ImagePromptEntry {
  ko: string;
  en: string;
}

export interface CostState {
  /** 이번 세션 동안 발생한 예상 누적 비용(원) */
  sessionEstimatedCostWon: number;
}

export const DEFAULT_DISCLOSURE_TEXT =
  "이 포스팅은 쇼핑커넥트 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

export interface Settings {
  apiKeys: ApiKeys;
  demoMode: boolean;
  /** 켜져 있으면 이번 세션 동안 유료 프로바이더 확인 모달을 띄우지 않는다 */
  autoAllowPaidThisSession: boolean;
  /** 블로그 글 첫머리/끝에 자동으로 삽입되는 대가성 표기 문구 */
  disclosureText: string;
}

const defaultSettings: Settings = {
  apiKeys: {},
  demoMode: false,
  autoAllowPaidThisSession: false,
  disclosureText: DEFAULT_DISCLOSURE_TEXT,
};

interface AppState {
  settings: Settings;
  cost: CostState;
  hasHydrated: boolean;
  product: Product | null;
  blogResult: BlogResult | null;
  threadsResult: ThreadsResult | null;
  scenes: Scene[] | null;
  productImageKeys: string[];
  imagePrompts: Record<string, ImagePromptEntry>;
  sceneImages: SceneImage[];

  setApiKey: (provider: keyof ApiKeys, value: string) => void;
  clearApiKey: (provider: keyof ApiKeys) => void;
  setDemoMode: (value: boolean) => void;
  setAutoAllowPaidThisSession: (value: boolean) => void;
  setDisclosureText: (value: string) => void;
  addSessionCost: (won: number) => void;
  resetSessionCost: () => void;
  setHasHydrated: (value: boolean) => void;
  setProduct: (product: Product) => void;
  setBlogResult: (result: BlogResult | null) => void;
  resetBlog: () => void;
  setThreadsResult: (result: ThreadsResult | null) => void;
  resetThreads: () => void;
  setScenes: (scenes: Scene[] | null) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  resetScript: () => void;

  addProductImageKey: (key: string) => void;
  removeProductImageKey: (key: string) => void;
  setImagePrompt: (sceneId: string, entry: ImagePromptEntry) => void;
  addSceneImage: (image: SceneImage) => void;
  removeSceneImage: (id: string) => void;
  setSceneImageUsed: (sceneId: string, imageId: string) => void;
  resetImages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      cost: { sessionEstimatedCostWon: 0 },
      hasHydrated: false,
      product: null,
      blogResult: null,
      threadsResult: null,
      scenes: null,
      productImageKeys: [],
      imagePrompts: {},
      sceneImages: [],

      setApiKey: (provider, value) =>
        set((s) => ({
          settings: {
            ...s.settings,
            apiKeys: { ...s.settings.apiKeys, [provider]: value },
          },
        })),

      clearApiKey: (provider) =>
        set((s) => {
          const apiKeys = { ...s.settings.apiKeys };
          delete apiKeys[provider];
          return { settings: { ...s.settings, apiKeys } };
        }),

      setDemoMode: (value) =>
        set((s) => ({ settings: { ...s.settings, demoMode: value } })),

      setAutoAllowPaidThisSession: (value) =>
        set((s) => ({
          settings: { ...s.settings, autoAllowPaidThisSession: value },
        })),

      setDisclosureText: (value) =>
        set((s) => ({ settings: { ...s.settings, disclosureText: value } })),

      setProduct: (product) => set({ product }),
      setBlogResult: (blogResult) => set({ blogResult }),
      resetBlog: () => set({ product: null, blogResult: null }),

      setThreadsResult: (threadsResult) => set({ threadsResult }),
      resetThreads: () => set({ threadsResult: null }),

      setScenes: (scenes) => set({ scenes }),
      updateScene: (id, patch) =>
        set((s) => ({
          scenes: s.scenes?.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)) ?? null,
        })),
      resetScript: () => set({ scenes: null }),

      addProductImageKey: (key) =>
        set((s) => ({ productImageKeys: [...s.productImageKeys, key] })),
      removeProductImageKey: (key) =>
        set((s) => ({ productImageKeys: s.productImageKeys.filter((k) => k !== key) })),

      setImagePrompt: (sceneId, entry) =>
        set((s) => ({ imagePrompts: { ...s.imagePrompts, [sceneId]: entry } })),

      addSceneImage: (image) => set((s) => ({ sceneImages: [...s.sceneImages, image] })),
      removeSceneImage: (id) =>
        set((s) => ({ sceneImages: s.sceneImages.filter((img) => img.id !== id) })),
      setSceneImageUsed: (sceneId, imageId) =>
        set((s) => ({
          sceneImages: s.sceneImages.map((img) =>
            img.sceneId === sceneId ? { ...img, used: img.id === imageId } : img,
          ),
        })),
      resetImages: () =>
        set({ productImageKeys: [], imagePrompts: {}, sceneImages: [] }),

      addSessionCost: (won) =>
        set((s) => ({
          cost: {
            sessionEstimatedCostWon: s.cost.sessionEstimatedCostWon + won,
          },
        })),

      resetSessionCost: () => set({ cost: { sessionEstimatedCostWon: 0 } }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "blog-agent-settings",
      storage: createJSONStorage(() => localStorage),
      // 텍스트 상태(설정 + 단계별 결과)만 저장한다. cost/hasHydrated는
      // 세션성 값이라 제외하고, 이미지/오디오/영상 Blob은 IndexedDB(storage.ts)로 뺀다.
      partialize: (s) => ({
        settings: s.settings,
        product: s.product,
        blogResult: s.blogResult,
        threadsResult: s.threadsResult,
        scenes: s.scenes,
        productImageKeys: s.productImageKeys,
        imagePrompts: s.imagePrompts,
        sceneImages: s.sceneImages,
      }),
      skipHydration: true,
    },
  ),
);

/** 클라이언트 마운트 후 한 번 호출해 localStorage 값을 반영한다. */
export function hydrateAppStore() {
  useAppStore.persist.rehydrate();
  useAppStore.getState().setHasHydrated(true);
}
