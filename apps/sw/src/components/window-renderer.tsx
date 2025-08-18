"use client";

import type { WindowType } from "@/lib/window-types";
import { WINDOW_TYPES } from "@/lib/window-types";
import { FileViewerWindow } from "./file-viewer-window";
import { FormWindow } from "./form-window";
import { PreviewWindow } from "./preview-window";
import { TodosWindow } from "./todos-window";

interface WindowRendererProps {
  type: WindowType;
}

export function WindowRenderer({ type }: WindowRendererProps) {
  switch (type) {
    case WINDOW_TYPES.TODOS:
      return <TodosWindow />;
    case WINDOW_TYPES.FORM:
      return <FormWindow />;
    case WINDOW_TYPES.FILE_VIEWER:
      return <FileViewerWindow />;
    case WINDOW_TYPES.PREVIEW:
      return <PreviewWindow />;
    default:
      return (
        <div className="flex items-center justify-center text-muted-foreground">
          Unknown window type
        </div>
      );
  }
}
