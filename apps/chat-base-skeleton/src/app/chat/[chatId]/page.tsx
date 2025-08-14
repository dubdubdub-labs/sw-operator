"use client";
import { Chat } from "@repo/chat-base-conversation";
import { use } from "react";

type ChatPageParams = Promise<{
  chatId: string;
}>;

export default function ChatPage({ params }: { params: ChatPageParams }) {
  const { chatId } = use(params);
  return <Chat chatId={chatId} />;
}
