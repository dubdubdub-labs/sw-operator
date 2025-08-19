import {
  convertToModelMessages,
  type InferUITools,
  streamText,
  type ToolSet,
  tool,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { WINDOW_TYPES } from "@/lib/window-types";
import { DESKTOP_ORCHESTRATOR_SYSTEM_PROMPT } from "./system-prompt";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const createWindow = tool({
  name: "createWindow",
  description: "Create a new window on a desktop",
  inputSchema: z.object({
    desktopId: z.string(),
    windowType: z.enum(Object.values(WINDOW_TYPES)),
    position: z.number().min(0).max(3).optional(),
  }),
});

const deleteWindow = tool({
  name: "deleteWindow",
  description: "Delete a window from its desktop",
  inputSchema: z.object({
    windowId: z.string(),
  }),
});

const moveWindow = tool({
  name: "moveWindow",
  description: "Move a window to a new position on the same desktop",
  inputSchema: z.object({
    desktopId: z.string(),
    windowId: z.string(),
    newPosition: z.number().min(0).max(3),
  }),
});

const createDesktop = tool({
  name: "createDesktop",
  description: "Create a new desktop with optional initial windows",
  inputSchema: z.object({
    name: z.string(),
    windows: z
      .array(
        z.object({
          type: z.enum(Object.values(WINDOW_TYPES)),
          position: z.number().min(0).max(3).optional(),
        })
      )
      .optional(),
  }),
});

const deleteDesktop = tool({
  name: "deleteDesktop",
  description: "Delete a desktop and all its windows",
  inputSchema: z.object({
    desktopId: z.string(),
  }),
});

const desktopManagementTools = {
  createWindow,
  deleteWindow,
  moveWindow,
  createDesktop,
  deleteDesktop,
} as const satisfies ToolSet;

export type DesktopManagementTools = InferUITools<
  typeof desktopManagementTools
>;

export type DesktopManagementUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  DesktopManagementTools
>;

export async function POST(req: Request) {
  const {
    messages,
    desktopState,
  }: {
    messages: DesktopManagementUIMessage[];
    desktopState?: {
      desktops: Array<{
        id: string;
        name: string;
        windows: Array<{
          id: string;
          type: string;
          position: number;
        }>;
      }>;
      activeDesktopId: string;
    };
  } = await req.json();

  // Build system prompt with desktop state context if available
  let systemPrompt = DESKTOP_ORCHESTRATOR_SYSTEM_PROMPT;

  if (desktopState) {
    const desktopContext = `\n\nCurrent Desktop State:
- Active Desktop: ${desktopState.activeDesktopId}
- Total Desktops: ${desktopState.desktops.length}

Desktop Details:
${desktopState.desktops
  .map(
    (desktop) =>
      `- ${desktop.name} (${desktop.id}): ${desktop.windows.length} windows\n  Windows: ${desktop.windows.map((w) => `${w.type} at position ${w.position}`).join(", ") || "none"}`
  )
  .join("\n")}`;

    systemPrompt += desktopContext;
  }

  const result = streamText({
    model: "gpt-5",
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: desktopManagementTools,
  });

  return result.toUIMessageStreamResponse();
}
