"use client";

import { useEffect } from "react";
import { useDesktopStore } from "@/lib/desktop-store";

export function CSSVariablesProvider() {
  const { getActiveDesktop, getCurrentPreset } = useDesktopStore();
  const activeDesktop = getActiveDesktop();
  const currentPreset = getCurrentPreset();

  useEffect(() => {
    if (!activeDesktop) {
      return;
    }

    const root = document.documentElement;
    const { glass3d } = currentPreset;

    const cssProperties = {
      "--filter-glass3d-blur": glass3d.filterBlur,
      "--filter-glass3d-brightness": glass3d.filterBrightness.toString(),
      "--filter-glass3d-saturate": glass3d.filterSaturate.toString(),
      "--color-glass3d": glass3d.backgroundColor,
      "--shadow-glass3d-intensity": glass3d.shadowIntensity.toString(),
    };

    for (const [property, value] of Object.entries(cssProperties)) {
      root.style.setProperty(property, value);
    }
  }, [activeDesktop, currentPreset]);

  return null;
}
