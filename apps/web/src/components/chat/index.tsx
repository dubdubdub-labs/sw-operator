"use client";

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
import { Reasoning } from "@repo/ui/components/ai-elements/reasoning";
import { Response } from "@repo/ui/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@repo/ui/components/ai-elements/source";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";

export default function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),

    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // // run client-side tools that are automatically executed:
    // async onToolCall({ toolCall }) {
    //   if (toolCall.toolName === "getLocation") {
    //     const cities = ["New York", "Los Angeles", "Chicago", "San Francisco"];

    //     // No await - avoids potential deadlocks
    //     addToolResult({
    //       tool: "getLocation",
    //       toolCallId: toolCall.toolCallId,
    //       output: cities[Math.floor(Math.random() * cities.length)],
    //     });
    //   }
    // },
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col p-3">
      <Conversation className="relative w-full flex-1">
        <ConversationContent>
          {messages?.map((message) => (
            <div key={message.id}>
              {message.role === "assistant" && (
                <Sources>
                  <SourcesTrigger
                    count={
                      message.parts.filter((part) => part.type === "source-url")
                        .length
                    }
                  />
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "source-url":
                        return (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source
                              href={part.url}
                              key={`${message.id}-${i}`}
                              title={part.url}
                            />
                          </SourcesContent>
                        );
                      default:
                        return null;
                    }
                  })}
                </Sources>
              )}
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <Response key={`${message.id}-${i}`}>
                            {part.text}
                          </Response>
                        );
                      case "reasoning":
                        return (
                          <Reasoning key={`${message.id}-${i}`}>
                            {part.text}
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            </div>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <PromptInput
        className="relative mt-4 rounded-md"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
        }}
      >
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
        <PromptInputToolbar>
          <PromptInputSubmit
            className="absolute right-1 bottom-1"
            disabled={!input}
            status={status}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
