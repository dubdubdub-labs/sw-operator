"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackgroundPreset, PresetId } from "./background-presets";
import { backgroundPresets, defaultPresetId } from "./background-presets";
import type { WindowType } from "./window-types";
import { WINDOW_TYPES } from "./window-types";

export interface WindowInstance {
  id: string;
  type: WindowType;
  position: number; // 0-3 for the 4 window slots
}

export interface Desktop {
  id: string;
  name: string;
  backgroundPreset: PresetId;
  windows: WindowInstance[];
}

interface DesktopStore {
  desktops: Desktop[];
  activeDesktopId: string;

  // Desktop management
  addDesktop: (name?: string, backgroundPreset?: PresetId) => string;
  removeDesktop: (desktopId: string) => void;
  setActiveDesktop: (desktopId: string) => void;
  setDesktopBackground: (desktopId: string, backgroundPreset: PresetId) => void;
  renameDesktop: (desktopId: string, name: string) => void;

  // Window management
  addWindow: (
    desktopId: string,
    windowType: WindowType,
    position?: number
  ) => void;
  removeWindow: (desktopId: string, windowId: string) => void;
  moveWindow: (
    desktopId: string,
    windowId: string,
    newPosition: number
  ) => void;

  // Background management
  getCurrentPreset: () => BackgroundPreset;
  setCurrentPreset: (presetId: PresetId) => void;

  // Getters
  getActiveDesktop: () => Desktop | undefined;
  getDesktop: (desktopId: string) => Desktop | undefined;
}

const createDefaultDesktop = (): Desktop => ({
  id: "desktop-1",
  name: "Desktop 1",
  backgroundPreset: defaultPresetId,
  windows: [
    { id: "window-1", type: WINDOW_TYPES.TODOS, position: 0 },
    { id: "window-2", type: WINDOW_TYPES.FORM, position: 1 },
    { id: "window-3", type: WINDOW_TYPES.FILE_VIEWER, position: 2 },
    { id: "window-4", type: WINDOW_TYPES.PREVIEW, position: 3 },
  ],
});

export const useDesktopStore = create<DesktopStore>()(
  persist(
    (set, get) => ({
      desktops: [createDefaultDesktop()],
      activeDesktopId: "desktop-1",

      addDesktop: (name, backgroundPreset = defaultPresetId) => {
        const newId = `desktop-${Date.now()}`;
        const newDesktop: Desktop = {
          id: newId,
          name: name || `Desktop ${get().desktops.length + 1}`,
          backgroundPreset,
          windows: [],
        };

        set((state) => ({
          desktops: [...state.desktops, newDesktop],
          activeDesktopId: newId,
        }));

        return newId;
      },

      removeDesktop: (desktopId) => {
        const state = get();
        if (state.desktops.length <= 1) {
          return; // Don't allow removing the last desktop
        }

        const newDesktops = state.desktops.filter((d) => d.id !== desktopId);
        const newActiveId =
          state.activeDesktopId === desktopId
            ? newDesktops[0]?.id || ""
            : state.activeDesktopId;

        set({
          desktops: newDesktops,
          activeDesktopId: newActiveId,
        });
      },

      setActiveDesktop: (desktopId) => {
        set({ activeDesktopId: desktopId });
      },

      setDesktopBackground: (desktopId, backgroundPreset) => {
        set((state) => ({
          desktops: state.desktops.map((desktop) =>
            desktop.id === desktopId
              ? { ...desktop, backgroundPreset }
              : desktop
          ),
        }));
      },

      renameDesktop: (desktopId, name) => {
        set((state) => ({
          desktops: state.desktops.map((desktop) =>
            desktop.id === desktopId ? { ...desktop, name } : desktop
          ),
        }));
      },

      addWindow: (desktopId, windowType, position) => {
        set((state) => ({
          desktops: state.desktops.map((desktop) => {
            if (desktop.id !== desktopId) {
              return desktop;
            }

            // Limit to 4 windows per desktop
            if (desktop.windows.length >= 4) {
              return desktop;
            }

            // Find available position if not specified
            const usedPositions = new Set(
              desktop.windows.map((w) => w.position)
            );
            const availablePosition =
              position !== undefined && !usedPositions.has(position)
                ? position
                : [0, 1, 2, 3].find((pos) => !usedPositions.has(pos)) || 0;

            const newWindow: WindowInstance = {
              id: `window-${Date.now()}`,
              type: windowType,
              position: availablePosition,
            };

            return {
              ...desktop,
              windows: [...desktop.windows, newWindow],
            };
          }),
        }));
      },

      removeWindow: (desktopId, windowId) => {
        set((state) => ({
          desktops: state.desktops.map((desktop) =>
            desktop.id === desktopId
              ? {
                  ...desktop,
                  windows: desktop.windows.filter((w) => w.id !== windowId),
                }
              : desktop
          ),
        }));
      },

      moveWindow: (desktopId, windowId, newPosition) => {
        set((state) => ({
          desktops: state.desktops.map((desktop) => {
            if (desktop.id !== desktopId) {
              return desktop;
            }

            // Check if position is available
            const targetWindow = desktop.windows.find((w) => w.id === windowId);
            if (!targetWindow) {
              return desktop;
            }

            const otherWindows = desktop.windows.filter(
              (w) => w.id !== windowId
            );
            const positionTaken = otherWindows.some(
              (w) => w.position === newPosition
            );

            if (positionTaken) {
              // Swap positions
              return {
                ...desktop,
                windows: desktop.windows.map((w) => {
                  if (w.id === windowId) {
                    return { ...w, position: newPosition };
                  }
                  if (w.position === newPosition) {
                    return { ...w, position: targetWindow.position };
                  }
                  return w;
                }),
              };
            }
            // Just move to empty position
            return {
              ...desktop,
              windows: desktop.windows.map((w) =>
                w.id === windowId ? { ...w, position: newPosition } : w
              ),
            };
          }),
        }));
      },

      getCurrentPreset: () => {
        const state = get();
        const activeDesktop = state.desktops.find(
          (d) => d.id === state.activeDesktopId
        );
        const presetId = activeDesktop?.backgroundPreset ?? defaultPresetId;
        return (
          backgroundPresets[presetId] ?? backgroundPresets[defaultPresetId]
        );
      },

      setCurrentPreset: (presetId) => {
        const state = get();
        const activeDesktop = state.desktops.find(
          (d) => d.id === state.activeDesktopId
        );
        if (activeDesktop) {
          get().setDesktopBackground(activeDesktop.id, presetId);
        }
      },

      getActiveDesktop: () => {
        const state = get();
        return state.desktops.find((d) => d.id === state.activeDesktopId);
      },

      getDesktop: (desktopId) => {
        return get().desktops.find((d) => d.id === desktopId);
      },
    }),
    {
      name: "desktop-store",
    }
  )
);
