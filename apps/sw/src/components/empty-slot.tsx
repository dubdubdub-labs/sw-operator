"use client";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useDesktopStore } from "@/lib/desktop-store";
import {
  WINDOW_TYPE_LABELS,
  WINDOW_TYPES,
  type WindowType,
} from "@/lib/window-types";

interface EmptySlotProps {
  position: number;
}

export function EmptySlot({ position }: EmptySlotProps) {
  const { addWindow, getActiveDesktop } = useDesktopStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddWindow = (windowType: WindowType) => {
    const activeDesktop = getActiveDesktop();
    if (activeDesktop) {
      addWindow(activeDesktop.id, windowType, position);
    }
  };

  return (
    <div className="flex h-full w-128 items-center justify-center rounded-3xl border-2 border-white/20 border-dashed text-white/40">
      {isMounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-12 w-12 rounded-full border-white/30 bg-white/10 hover:bg-white/20"
              size="sm"
              variant="outline"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(WINDOW_TYPES).map(([_key, value]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => handleAddWindow(value)}
              >
                {WINDOW_TYPE_LABELS[value]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-white/30 bg-white/10">
          <Plus className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
