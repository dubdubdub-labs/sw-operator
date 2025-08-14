import {
  type AppTransactionChunk,
  adminDb,
  id,
} from "@repo/chat-base-db/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export async function POST(req: Request) {
  try {
    const { messages, chatId }: { messages: UIMessage[]; chatId?: string } =
      await req.json();

    // Stream the AI response
    const result = streamText({
      model: "gpt-5-mini",
      system:
        "You are a helpful assistant that can analyze PDFs and answer questions about them.",
      messages: convertToModelMessages(messages),
    });

    // Return the streaming response with metadata handling
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () => id(),
      onFinish: async ({ messages: allMessages }) => {
        if (!chatId) {
          return;
        }

        try {
          // Get or create chat
          const { chats } = await adminDb.query({
            chats: {
              $: {
                where: { id: chatId },
              },
            },
          });

          const existingChat = chats[0];

          // Create chat if it doesn't exist
          if (existingChat) {
            // Update chat's updatedAt
            await adminDb.transact([
              adminDb.tx.chats[existingChat.id]!.update({
                updatedAt: Date.now(),
              }),
            ]);
          } else {
            const txns = [
              adminDb.tx.chats[chatId]!.update({
                title:
                  messages[0]?.parts?.[0]?.type === "text"
                    ? messages[0].parts[0].text?.slice(0, 100)
                    : "New Chat",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
            ];
            await adminDb.transact(txns);
          }

          // Save messages to database
          const messageTxns: AppTransactionChunk<
            "messages" | "messageParts"
          >[] = [];

          for (const message of allMessages) {
            const messageId = message.id || id();

            // Create message
            messageTxns.push(
              adminDb.tx.messages[messageId]!.update({
                role: message.role,
                createdAt: new Date().toISOString(),
              })
            );

            // Link message to chat
            messageTxns.push(
              adminDb.tx.messages[messageId]!.link({
                chat: chatId,
              })
            );

            // Create message parts
            if (message.parts && message.parts.length > 0) {
              message.parts.forEach((part, index) => {
                const partId = id();

                if (part.type === "text") {
                  messageTxns.push(
                    adminDb.tx.messageParts[partId]!.create({
                      type: "text",
                      text: part.text,
                      orderIndex: index,
                    })
                  );
                } else if (part.type === "file") {
                  messageTxns.push(
                    adminDb.tx.messageParts[partId]!.create({
                      type: "file",
                      url: part.url,
                      filename: part.filename,
                      mediaType: part.mediaType,
                      orderIndex: index,
                    })
                  );
                }

                // Link part to message
                messageTxns.push(
                  adminDb.tx.messageParts[partId]!.link({
                    message: messageId,
                  })
                );
              });
            }
          }

          await adminDb.transact(messageTxns);
        } catch (error) {
          console.error(
            "Error saving chat to database:",
            JSON.stringify(error)
          );
        }
      },
    });
  } catch (error) {
    console.error("Error in chat API route:", JSON.stringify(error));
    return new Response("Internal Server Error", { status: 500 });
  }
}
