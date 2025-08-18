export const WINDOW_TYPES = {
  TODOS: "todos",
  FORM: "form",
  FILE_VIEWER: "file_viewer",
  PREVIEW: "preview",
} as const;

export type WindowType = (typeof WINDOW_TYPES)[keyof typeof WINDOW_TYPES];

export const WINDOW_TYPE_LABELS = {
  [WINDOW_TYPES.TODOS]: "Todos",
  [WINDOW_TYPES.FORM]: "Form",
  [WINDOW_TYPES.FILE_VIEWER]: "File Viewer",
  [WINDOW_TYPES.PREVIEW]: "Preview",
} as const;
