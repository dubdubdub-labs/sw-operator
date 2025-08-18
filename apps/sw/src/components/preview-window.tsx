"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { ArrowLeft, ArrowRight, RefreshCw, X } from "lucide-react";
import { useCallback, useState } from "react";
import { usePreviewWindowStore } from "../lib/preview-window-store";
import { formatUrl, normalizeUrl } from "../lib/url-utils";
import { Window } from "./window";
import { WindowToolbar } from "./window-toolbar";

interface PreviewWindowProps {
  windowId?: string;
}

export function PreviewWindow({ windowId = "default" }: PreviewWindowProps) {
  const [urlInput, setUrlInput] = useState("");

  const store = usePreviewWindowStore(windowId);
  const {
    tabs,
    activeTabId,
    history,
    historyIndex,
    setActiveTab,
    closeTab,
    navigateToUrl,
    goBack,
    goForward,
    refresh,
  } = store;

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const currentUrl = activeTab?.url || "";

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = urlInput.trim();
      if (trimmedInput) {
        const url = normalizeUrl(trimmedInput);
        navigateToUrl(url);
        setUrlInput("");
      }
    },
    [urlInput, navigateToUrl]
  );

  return (
    <Window className="p-0">
      <WindowToolbar>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              className="h-6 w-6 p-0"
              disabled={historyIndex <= 0}
              onClick={goBack}
              size="sm"
              title={
                historyIndex > 0
                  ? `Back to ${history[historyIndex - 1]}`
                  : "No previous page"
              }
              variant="ghost"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              className="h-6 w-6 p-0"
              disabled={historyIndex >= history.length - 1}
              onClick={goForward}
              size="sm"
              title={
                historyIndex < history.length - 1
                  ? `Forward to ${history[historyIndex + 1]}`
                  : "No next page"
              }
              variant="ghost"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              className="h-6 w-6 p-0"
              onClick={refresh}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          <form className="flex items-center" onSubmit={handleUrlSubmit}>
            <Input
              className="h-6 w-32 rounded-full text-xs"
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL..."
              value={urlInput}
            />
          </form>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              {tabs.map((tab) => (
                <div className="flex items-center" key={tab.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className={`h-6 max-w-16 truncate rounded-l-full px-2 text-xs ${
                          activeTabId === tab.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                        size="sm"
                        variant="ghost"
                      >
                        {tab.title}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{formatUrl(tab.url)}</p>
                    </TooltipContent>
                  </Tooltip>
                  {tabs.length > 1 && (
                    <Button
                      className="h-6 w-4 rounded-r-full p-0"
                      onClick={() => closeTab(tab.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  )}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </WindowToolbar>

      <div className="flex h-full flex-col pt-14">
        <iframe
          className="size-full rounded-b-3xl"
          key={`${activeTab?.id}-${activeTab?.refreshKey || 0}`}
          src={currentUrl}
          title={activeTab?.title || "Preview"}
        />
      </div>
    </Window>
  );
}
