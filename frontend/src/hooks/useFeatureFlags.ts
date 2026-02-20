"use client";

import { useEffect, useState } from "react";
import { featureFlags } from "@/lib/feature-flags";

type RuntimeFeatureFlagsResponse = {
  enablePasswordAuth?: boolean;
  googleClientId?: string;
};

export function useFeatureFlags() {
  const [enablePasswordAuth, setEnablePasswordAuth] = useState<boolean>(featureFlags.enablePasswordAuth);
  const [googleClientId, setGoogleClientId] = useState<string>(featureFlags.googleClientId);
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
        if (active && typeof data.googleClientId === "string") {
          setGoogleClientId(data.googleClientId.trim());
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
    googleClientId,
    ready,
  };
}
