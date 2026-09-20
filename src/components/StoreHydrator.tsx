"use client";

import { useEffect } from "react";
import { hydrateAppStore } from "@/lib/store";

/** 마운트 시 한 번 zustand persist를 rehydrate 한다. 화면에는 아무것도 그리지 않는다. */
export function StoreHydrator() {
  useEffect(() => {
    hydrateAppStore();
  }, []);

  return null;
}
