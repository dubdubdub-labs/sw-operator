import {
  type AppTransactionChunk,
  db,
  id as newId,
} from "@repo/chat-base-db/client";

import type { UIMessage } from "ai";
import { useMemo } from "react";

export const useChats = () => {
  const { data, error, isLoading } = db.useQuery({
    chats: {
      $: {
        order: {
          serverCreatedAt: "desc",
        },
      },
      messages: {
        $: {
          order: {
            serverCreatedAt: "desc",
          },
        },
        parts: {
          $: {
            order: {
              serverCreatedAt: "asc",
            },
          },
        },
      },
    },
  });

  const chats = data?.chats;

  const createChat = async () => {
    const chatId = newId();
    const chat = db.tx.chats[chatId];

    if (!chat) {
      throw new Error("Chat not found");
    }

    await db.transact([
      chat.create({
        title: "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);
    return chatId;
  };

  const updateChat = async (chatId: string, updates: { title?: string }) => {
    const chat = db.tx.chats[chatId];

    if (!chat) {
      throw new Error("Chat not found");
    }

    await db.transact([
      chat.update({
        ...updates,
        updatedAt: new Date(),
      }),
    ]);
  };

  const deleteChat = async ({ chatId }: { chatId: string }) => {
    const chat = db.tx.chats[chatId];

    if (!chat) {
      throw new Error("Chat not found");
    }

    await db.transact([chat.delete()]);
  };

  return {
    chats,
    createChat,
    updateChat,
    deleteChat,
    isLoading,
    error,
  };
};

export const useChat = ({ id }: { id: string }) => {
  const { data, error, isLoading } = db.useQuery({
    chats: {
      $: {
        where: {
          id,
        },
      },
      messages: {
        $: {
          order: {
            serverCreatedAt: "asc",
          },
        },
        parts: {
          $: {
            order: {
              serverCreatedAt: "asc",
            },
          },
        },
      },
    },
  });

  const chat = data?.chats?.[0];

  const updateChatTitle = async ({ title }: { title: string }) => {
    const dbChat = db.tx.chats[id];

    if (!dbChat) {
      throw new Error("Chat not found");
    }

    await db.transact([
      dbChat.update({
        title,
        updatedAt: new Date(),
      }),
    ]);
  };

  const addMessage = async ({
    role,
    parts,
  }: {
    role: string;
    parts: Array<{
      type: string;
      text?: string;
      url?: string;
      filename?: string;
      mediaType?: string;
    }>;
  }) => {
    const messageId = newId();

    const dbMessage = db.tx.messages[messageId];

    if (!dbMessage) {
      throw new Error("Message not found");
    }

    const txs: AppTransactionChunk<"messages" | "messageParts">[] = [
      dbMessage
        .create({
          role,
          createdAt: new Date(),
        })
        .link({
          chat: id,
        }),
    ];

    parts.forEach((part, index) => {
      const partId = newId();
      const dbPart = db.tx.messageParts[partId];

      if (!dbPart) {
        throw new Error("Part not found");
      }

      txs.push(
        dbPart
          .create({
            type: part.type ?? "text",
            text: part.text,
            url: part.url,
            filename: part.filename,
            mediaType: part.mediaType,
            orderIndex: index,
          })
          .link({
            message: messageId,
          })
      );
    });

    await db.transact(txs);

    const dbChat = db.tx.chats[id];

    if (!dbChat) {
      throw new Error("Chat not found");
    }

    await db.transact([
      dbChat.update({
        updatedAt: new Date(),
      }),
    ]);
  };

  const uiMessages: UIMessage[] = useMemo(() => {
    if (!chat?.messages) {
      return [];
    }

    return chat.messages.map((message) => {
      // Map message parts to UIMessage parts format
      const parts = message.parts
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((part) => {
          if (part.type === "file" && part.url) {
            return {
              type: "file" as const,
              url: part.url,
              filename: part.filename ?? "file",
              mediaType: part.mediaType ?? "application/octet-stream",
            };
          }
          // Default to text part
          return {
            type: "text" as const,
            text: part.text ?? "",
          };
        });

      return {
        id: message.id,
        role: message.role as "system" | "user" | "assistant",
        parts,
      };
    });
  }, [chat]);

  return {
    chat,
    uiMessages,
    updateChatTitle,
    addMessage,
    isLoading,
    error,
  };
};
