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

export interface CostState {
  /** 이번 세션 동안 발생한 예상 누적 비용(원) */
  sessionEstimatedCostWon: number;
}

export interface Settings {
  apiKeys: ApiKeys;
  demoMode: boolean;
  /** 켜져 있으면 이번 세션 동안 유료 프로바이더 확인 모달을 띄우지 않는다 */
  autoAllowPaidThisSession: boolean;
}

const defaultSettings: Settings = {
  apiKeys: {},
  demoMode: false,
  autoAllowPaidThisSession: false,
};

interface AppState {
  settings: Settings;
  cost: CostState;
  hasHydrated: boolean;

  setApiKey: (provider: keyof ApiKeys, value: string) => void;
  clearApiKey: (provider: keyof ApiKeys) => void;
  setDemoMode: (value: boolean) => void;
  setAutoAllowPaidThisSession: (value: boolean) => void;
  addSessionCost: (won: number) => void;
  resetSessionCost: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      cost: { sessionEstimatedCostWon: 0 },
      hasHydrated: false,

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
      // 텍스트 상태만 저장한다. cost/hasHydrated는 세션성 값이라 제외한다.
      partialize: (s) => ({ settings: s.settings }),
      skipHydration: true,
    },
  ),
);

/** 클라이언트 마운트 후 한 번 호출해 localStorage 값을 반영한다. */
export function hydrateAppStore() {
  useAppStore.persist.rehydrate();
  useAppStore.getState().setHasHydrated(true);
}
