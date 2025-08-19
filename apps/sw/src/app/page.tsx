"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DeletableWindow } from "@/components/deletable-window";
import { DesktopNavigator } from "@/components/desktop-navigator";
import { EmptySlot } from "@/components/empty-slot";
import { WindowRenderer } from "@/components/window-renderer";
import { backgroundPresets, type PresetId } from "@/lib/background-presets";
import { useDesktopStore } from "@/lib/desktop-store";
import type { WindowType } from "@/lib/window-types";

function DesktopView({
  desktop,
}: {
  desktop: {
    id: string;
    name: string;
    backgroundPreset: PresetId;
    windows: Array<{ id: string; type: WindowType; position: number }>;
  };
}) {
  // Create a 2x2 grid array for positioning windows
  const windowGrid: Array<Array<{ id: string; type: WindowType } | null>> = [
    [null, null],
    [null, null],
  ];

  // Place windows in their positions
  for (const window of desktop.windows) {
    const row = Math.floor(window.position / 2);
    const col = window.position % 2;
    if (row < 2 && col < 2 && windowGrid[row]) {
      windowGrid[row][col] = {
        id: window.id,
        type: window.type,
      };
    }
  }

  const preset = backgroundPresets[desktop.backgroundPreset];

  return (
    <div className="relative h-screen w-screen flex-shrink-0">
      {/* Desktop background */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url(${preset.imagePath})`,
        }}
      >
        <div
          className={`h-full w-full ${preset.overlayColor} ${preset.blurAmount}`}
        />
      </div>

      {/* Desktop content */}
      <div className="relative z-10 flex h-screen w-screen items-center justify-center p-8">
        <div className="flex flex-col gap-8">
          {windowGrid.map((row, rowIndex) => (
            <div
              className="flex h-96 w-full gap-8"
              key={`desktop-${desktop.id}-row-${rowIndex}`}
            >
              {row.map((window, colIndex) => {
                const position = rowIndex * 2 + colIndex;
                return (
                  <div
                    className="h-full flex-1"
                    key={window?.id || `empty-${rowIndex}-${colIndex}`}
                  >
                    {window ? (
                      <DeletableWindow windowId={window.id}>
                        <WindowRenderer type={window.type} />
                      </DeletableWindow>
                    ) : (
                      <EmptySlot position={position} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { desktops, activeDesktopId } = useDesktopStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR and before hydration
  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const activeDesktopIndex = desktops.findIndex(
    (d) => d.id === activeDesktopId
  );

  return (
    <>
      <DesktopNavigator />
      <div className="overflow-hidden">
        <motion.div
          animate={{
            x: `-${activeDesktopIndex * 100}vw`,
          }}
          className="flex"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
        >
          {desktops.map((desktop) => (
            <DesktopView desktop={desktop} key={desktop.id} />
          ))}
        </motion.div>
      </div>
    </>
  );
}
