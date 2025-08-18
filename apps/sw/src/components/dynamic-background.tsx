"use client";

import { cn } from "@repo/ui/lib/utils";
import { useEffect, useState } from "react";
import { backgroundPresets, defaultPresetId } from "@/lib/background-presets";
import { useDesktopStore } from "@/lib/desktop-store";

export function DynamicBackground() {
  const { getCurrentPreset } = useDesktopStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use default preset during SSR and before hydration, otherwise use current preset
  const preset = isMounted
    ? getCurrentPreset()
    : backgroundPresets[defaultPresetId];

  return (
    <>
      <div
        className="fixed inset-0 z-0 bg-center bg-cover"
        style={{
          backgroundImage: `url('${preset.imagePath}')`,
        }}
      />
      <div
        className={cn(
          "fixed inset-0 z-0",
          preset.overlayColor,
          preset.blurAmount
        )}
        style={{
          backgroundColor: `rgba(255, 255, 255, ${preset.overlayOpacity})`,
        }}
      />
    </>
  );
}
