"use client";

import { TodosWindow } from "@/components/todos-window";

export default function Home() {
  return (
    <div className="flex h-screen w-screen items-center justify-center p-8">
      <div className="flex flex-col gap-8">
        <div className="flex h-96 w-full gap-8">
          <TodosWindow />
          <TodosWindow />
        </div>
        <div className="flex h-96 w-full gap-8">
          <TodosWindow />
          <TodosWindow />
        </div>
      </div>
    </div>
  );
}
