"use client";

import { useEffect, useState } from "react";
import { DeletableWindow } from "@/components/deletable-window";
import { DesktopNavigator } from "@/components/desktop-navigator";
import { EmptySlot } from "@/components/empty-slot";
import { WindowRenderer } from "@/components/window-renderer";
import { useDesktopStore } from "@/lib/desktop-store";
import type { WindowType } from "@/lib/window-types";

export default function Home() {
  const { getActiveDesktop } = useDesktopStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeDesktop = getActiveDesktop();

  // Show loading state during SSR and before hydration
  if (!(isMounted && activeDesktop)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Create a 2x2 grid array for positioning windows
  const windowGrid: Array<Array<{ id: string; type: WindowType } | null>> = [
    [null, null],
    [null, null],
  ];

  // Place windows in their positions
  for (const window of activeDesktop.windows) {
    const row = Math.floor(window.position / 2);
    const col = window.position % 2;
    if (row < 2 && col < 2 && windowGrid[row]) {
      windowGrid[row][col] = {
        id: window.id,
        type: window.type,
      };
    }
  }

  return (
    <>
      <DesktopNavigator />
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <div className="flex flex-col gap-8">
          {windowGrid.map((row, rowIndex) => (
            <div
              className="flex h-96 w-full gap-8"
              key={`desktop-${activeDesktop.id}-row-${rowIndex}`}
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
    </>
  );
}
