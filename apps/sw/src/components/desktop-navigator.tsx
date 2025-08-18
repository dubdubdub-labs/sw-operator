"use client";

import { Button } from "@repo/ui/components/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { Palette, Plus, Trash2 } from "lucide-react";
import {
  backgroundPresets,
  type PresetId,
  presetArray,
} from "@/lib/background-presets";
import { useDesktopStore } from "@/lib/desktop-store";

export function DesktopNavigator() {
  const {
    desktops,
    activeDesktopId,
    addDesktop,
    removeDesktop,
    setActiveDesktop,
    setDesktopBackground,
  } = useDesktopStore();

  const handleDesktopSelect = (desktopId: string) => {
    setActiveDesktop(desktopId);
  };

  const handleAddDesktop = () => {
    addDesktop();
  };

  const handleRemoveDesktop = (desktopId: string) => {
    if (desktops.length > 1) {
      removeDesktop(desktopId);
    }
  };

  const handleChangeBackground = (desktopId: string, presetId: PresetId) => {
    setDesktopBackground(desktopId, presetId);
  };

  return (
    <div className="-translate-x-1/2 fixed top-4 left-1/2 z-50">
      <div className="glass3d flex items-center gap-2 rounded-2xl p-2">
        {desktops.map((desktop) => {
          const preset = backgroundPresets[desktop.backgroundPreset];
          const isActive = desktop.id === activeDesktopId;

          return (
            <ContextMenu key={desktop.id}>
              <ContextMenuTrigger>
                <div
                  className={`group relative flex cursor-pointer items-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? "scale-105 ring-2 ring-white/30"
                      : "hover:scale-102 hover:ring-1 hover:ring-white/20"
                  }`}
                  onClick={() => handleDesktopSelect(desktop.id)}
                >
                  {/* Desktop preview */}
                  <div
                    className="h-12 w-20 rounded-xl bg-center bg-cover"
                    style={{
                      backgroundImage: `url(${preset.imagePath})`,
                    }}
                  >
                    {/* Overlay to show glass effect */}
                    <div
                      className={`h-full w-full rounded-xl ${preset.overlayColor}`}
                    />
                  </div>

                  {/* Desktop name */}
                  <div className="-bottom-6 -translate-x-1/2 absolute left-1/2 whitespace-nowrap rounded-md bg-black/50 px-2 py-1 text-white text-xs opacity-0 transition-opacity group-hover:opacity-100">
                    {desktop.name}
                  </div>
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent className="w-48">
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Palette className="mr-2 h-4 w-4" />
                    Change Background
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    {presetArray.map((backgroundPreset) => (
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        key={backgroundPreset.id}
                        onClick={() =>
                          handleChangeBackground(
                            desktop.id,
                            backgroundPreset.id
                          )
                        }
                      >
                        <div
                          className="h-4 w-6 rounded bg-center bg-cover"
                          style={{
                            backgroundImage: `url(${backgroundPreset.imagePath})`,
                          }}
                        />
                        {backgroundPreset.name}
                        {desktop.backgroundPreset === backgroundPreset.id && (
                          <span className="ml-auto text-muted-foreground text-xs">
                            ✓
                          </span>
                        )}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>

                <ContextMenuSeparator />

                {desktops.length > 1 && (
                  <ContextMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleRemoveDesktop(desktop.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Desktop
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        {/* Add desktop button */}
        <Button
          className="h-12 w-12 rounded-xl border-2 border-white/30 border-dashed bg-transparent p-0 hover:border-white/50 hover:bg-white/10"
          onClick={handleAddDesktop}
          size="sm"
          variant="ghost"
        >
          <Plus className="h-5 w-5 text-white/70" />
        </Button>
      </div>
    </div>
  );
}
