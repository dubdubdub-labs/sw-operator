"use client";

import { Button } from "@repo/ui/components/button";
import { X } from "lucide-react";
import { useDesktopStore } from "@/lib/desktop-store";

interface DeletableWindowProps {
  windowId: string;
  children: React.ReactNode;
}

export function DeletableWindow({ windowId, children }: DeletableWindowProps) {
  const { removeWindow, getActiveDesktop } = useDesktopStore();
  const activeDesktop = getActiveDesktop();

  const handleDeleteWindow = () => {
    if (activeDesktop) {
      removeWindow(activeDesktop.id, windowId);
    }
  };

  return (
    <div className="group relative h-full">
      {children}

      <div className="-top-7 absolute inset-x-0 z-10 h-12 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="glass3d absolute right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full p-0.5">
          <Button
            className="h-5 w-5 rounded-full p-0"
            onClick={handleDeleteWindow}
            size="sm"
            variant="ghost"
          >
            <X className="h-3 w-3 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
