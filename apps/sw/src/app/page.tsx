"use client";

import { FormWindow } from "@/components/form-window";
import { PreviewWindow } from "@/components/preview-window";
import { TodosWindow } from "@/components/todos-window";

export default function Home() {
  return (
    <div className="flex h-screen w-screen items-center justify-center p-8">
      <div className="flex flex-col gap-8">
        <div className="flex h-96 w-full gap-8">
          <TodosWindow />
          <FormWindow />
        </div>
        <div className="flex h-96 w-full gap-8">
          <TodosWindow />
          <PreviewWindow />
        </div>
      </div>
    </div>
  );
}
