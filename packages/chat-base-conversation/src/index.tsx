import { useChat } from "@ai-sdk/react";
import { id as newId } from "@repo/chat-base-db/client";
import { useChat as useDbChat } from "@repo/chat-base-hooks";
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
import { DefaultChatTransport } from "ai";
import { ArrowUpIcon, FileText } from "lucide-react";
import { useMemo, useState } from "react";

export function Chat({ chatId }: { chatId: string }) {
  const [input, setInput] = useState("");

  const { uiMessages: initialMessages } = useDbChat({ id: chatId });

  console.log(initialMessages);

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        chatId,
      },
    }),
    messages: initialMessages,
    generateId: () => newId(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    sendMessage({
      text: input,
    });

    setInput("");
  };

  const exampleSuggestions = useMemo(
    () => [
      "Summarize this PDF",
      "What are the key takeaways?",
      "Create an outline from the document",
      "Extract action items with owners",
    ],
    []
  );

  return (
    <div className="flex h-screen flex-col bg-background">
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
              placeholder="Ask about your PDFs or start chatting..."
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
