"use client";

import { useEffect, useState } from "react";
import { featureFlags } from "@/lib/feature-flags";

type RuntimeFeatureFlagsResponse = {
  enablePasswordAuth?: boolean;
};

export function useFeatureFlags() {
  const [enablePasswordAuth, setEnablePasswordAuth] = useState<boolean>(featureFlags.enablePasswordAuth);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFlags = async () => {
      try {
        const response = await fetch("/api/feature-flags", { cache: "no-store" });
        if (!response.ok) return;

        const data: RuntimeFeatureFlagsResponse = await response.json();
        if (active && typeof data.enablePasswordAuth === "boolean") {
          setEnablePasswordAuth(data.enablePasswordAuth);
        }
      } catch {
        // Keep build-time fallback if runtime lookup fails.
      } finally {
        if (active) setReady(true);
      }
    };

    void loadFlags();

    return () => {
      active = false;
    };
  }, []);

  return {
    enablePasswordAuth,
    ready,
  };
}
