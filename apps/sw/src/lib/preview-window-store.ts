import { create } from "zustand";

export interface Tab {
  id: string;
  url: string;
  title: string;
  refreshKey?: number;
}

export interface PreviewWindowState {
  tabs: Tab[];
  activeTabId: string;
  history: string[];
  historyIndex: number;
}

export interface PreviewWindowActions {
  setActiveTab: (tabId: string) => void;
  addTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  navigateToUrl: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
}

export type PreviewWindowStore = PreviewWindowState & PreviewWindowActions;

const DEFAULT_TABS: Tab[] = [
  {
    id: "1",
    url: "https://github.com",
    title: "GitHub",
  },
  {
    id: "2",
    url: "https://vercel.com",
    title: "Vercel",
  },
  {
    id: "3",
    url: "https://nextjs.org",
    title: "Next.js",
  },
];

export function createPreviewWindowStore(_windowId: string) {
  return create<PreviewWindowStore>((set, get) => ({
    tabs: DEFAULT_TABS,
    activeTabId: DEFAULT_TABS[0]?.id ?? "",
    history: [DEFAULT_TABS[0]?.url ?? ""],
    historyIndex: 0,

    setActiveTab: (tabId: string) => {
      set({ activeTabId: tabId });
    },

    addTab: (tab: Tab) => {
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    },

    closeTab: (tabId: string) => {
      const { tabs, activeTabId } = get();
      if (tabs.length <= 1) {
        return;
      }

      const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
      const newState: Partial<PreviewWindowState> = { tabs: updatedTabs };

      if (activeTabId === tabId && updatedTabs[0]) {
        newState.activeTabId = updatedTabs[0].id;
      }

      set(newState);
    },

    updateTab: (tabId: string, updates: Partial<Tab>) => {
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, ...updates } : tab
        ),
      }));
    },

    navigateToUrl: (url: string) => {
      const { activeTabId, history, historyIndex } = get();

      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, url } : tab
        ),
        history: [...history.slice(0, historyIndex + 1), url],
        historyIndex: historyIndex + 1,
      }));
    },

    goBack: () => {
      const { historyIndex, history, activeTabId } = get();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        const url = history[newIndex];
        if (url) {
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === activeTabId ? { ...tab, url } : tab
            ),
            historyIndex: newIndex,
          }));
        }
      }
    },

    goForward: () => {
      const { historyIndex, history, activeTabId } = get();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        const url = history[newIndex];
        if (url) {
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === activeTabId ? { ...tab, url } : tab
            ),
            historyIndex: newIndex,
          }));
        }
      }
    },

    refresh: () => {
      const { activeTabId } = get();
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, refreshKey: Date.now() } : tab
        ),
      }));
    },
  }));
}

const previewWindowStores = new Map<
  string,
  ReturnType<typeof createPreviewWindowStore>
>();

export function usePreviewWindowStore(windowId: string) {
  if (!previewWindowStores.has(windowId)) {
    previewWindowStores.set(windowId, createPreviewWindowStore(windowId));
  }
  return previewWindowStores.get(windowId)!();
}

export function getAllPreviewWindows() {
  return Array.from(previewWindowStores.entries()).map(([windowId, store]) => ({
    windowId,
    state: store.getState(),
  }));
}
