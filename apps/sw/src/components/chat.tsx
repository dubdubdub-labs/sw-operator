import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@repo/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@repo/ui/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@repo/ui/components/ai-elements/prompt-input";
import { Response } from "@repo/ui/components/ai-elements/response";
import {
  Suggestion,
  Suggestions,
} from "@repo/ui/components/ai-elements/suggestion";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ArrowUpIcon, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import type { DesktopManagementUIMessage } from "@/app/api/orchestrator-chat/route";
import { useDesktopStore } from "@/lib/desktop-store";
import type { WindowType } from "@/lib/window-types";

export function Chat() {
  const [input, setInput] = useState("");
  const {
    desktops,
    activeDesktopId,
    addWindow,
    removeWindow,
    moveWindow,
    addDesktop,
    removeDesktop,
  } = useDesktopStore();

  const { messages, sendMessage, status } = useChat<DesktopManagementUIMessage>(
    {
      transport: new DefaultChatTransport({
        api: "/api/orchestrator-chat",
        body: {
          desktopState: {
            desktops,
            activeDesktopId,
          },
        },
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onToolCall: ({ toolCall }) => {
        if (toolCall.dynamic) {
          console.log("Dynamic:", toolCall.toolName, toolCall.input);
          return;
        }

        // Process tool calls with actual desktop store actions
        switch (toolCall.toolName) {
          case "createWindow": {
            const createWindowInput = toolCall.input as {
              desktopId: string;
              windowType: WindowType;
              position?: number;
            };
            addWindow(
              createWindowInput.desktopId,
              createWindowInput.windowType,
              createWindowInput.position
            );
            break;
          }
          case "deleteWindow": {
            const deleteWindowInput = toolCall.input as { windowId: string };
            // Find the desktop containing this window
            const desktop = desktops.find((d) =>
              d.windows.some((w) => w.id === deleteWindowInput.windowId)
            );
            if (desktop) {
              removeWindow(desktop.id, deleteWindowInput.windowId);
            }
            break;
          }
          case "moveWindow": {
            const moveWindowInput = toolCall.input as {
              desktopId: string;
              windowId: string;
              newPosition: number;
            };
            moveWindow(
              moveWindowInput.desktopId,
              moveWindowInput.windowId,
              moveWindowInput.newPosition
            );
            break;
          }
          case "createDesktop": {
            const createDesktopInput = toolCall.input as {
              name: string;
              windows?: Array<{ type: WindowType; position?: number }>;
            };
            const newDesktopId = addDesktop(createDesktopInput.name);
            // Add initial windows if specified
            const windowsToAdd = createDesktopInput.windows || [];
            for (const windowSpec of windowsToAdd) {
              addWindow(newDesktopId, windowSpec.type, windowSpec.position);
            }
            break;
          }
          case "deleteDesktop": {
            const deleteDesktopInput = toolCall.input as { desktopId: string };
            removeDesktop(deleteDesktopInput.desktopId);
            break;
          }
          default:
            console.log("Unknown tool", toolCall.toolName);
            break;
        }
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    sendMessage({
      text: input,
    });

    setInput("");
  };

  const exampleSuggestions = useMemo(
    () => [
      "Create a new desktop for productivity",
      "Add a todo window to the current desktop",
      "Move windows to better organize my workspace",
      "Delete unused windows to clean up",
    ],
    []
  );

  return (
    <div className="flex h-100 flex-col bg-background">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          <div className="space-y-2">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const text = message.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("");
              const files = message.parts.filter(
                (p) => p.type === "file" && p.mediaType === "application/pdf"
              );

              return (
                <Message from={isUser ? "user" : "assistant"} key={message.id}>
                  <MessageContent>
                    {isUser ? (
                      <div className="space-y-2">
                        {text && <div>{text}</div>}
                        {files.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {files.map((part) =>
                              part.type === "file" &&
                              part.mediaType === "application/pdf" ? (
                                <div
                                  className="flex items-center gap-2 rounded-md bg-muted px-2 py-1"
                                  key={part.url}
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="text-xs">
                                    {part.filename}
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Response>{text}</Response>
                    )}
                  </MessageContent>
                </Message>
              );
            })}

            {/* {status === "streaming" && (
              <Message from="assistant">
                <MessageAvatar name="AI" src="/globe.svg" />
                <MessageContent className="flex items-center gap-2 text-muted-foreground">
                  <Loader size={16} />
                  Thinking...
                </MessageContent>
              </Message>
            )} */}
          </div>
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 && (
            <Suggestions>
              {exampleSuggestions.map((s) => (
                <Suggestion
                  key={s}
                  onClick={(val) => setInput(val)}
                  suggestion={s}
                />
              ))}
            </Suggestions>
          )}

          <PromptInput className="rounded-3xl p-1" onSubmit={handleSubmit}>
            <PromptInputTextarea
              disabled={status === "submitted"}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Manage your desktop and windows..."
              value={input}
            />
            <PromptInputToolbar className="justify-end">
              <PromptInputSubmit
                className="rounded-full"
                disabled={status !== "ready"}
                SendIcon={ArrowUpIcon}
                status={status}
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
