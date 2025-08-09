"use client";

import { use$Users } from "@repo/hooks";
import { Button } from "@repo/ui/components/button";

export default function Home() {
  const { users, error } = use$Users();

  console.log(users, error);

  return (
    <div className="bg-red-500">
      <h1 className="font-bold font-sans text-3xl">Hello World</h1>
      <Button>Click me</Button>
    </div>
  );
}
