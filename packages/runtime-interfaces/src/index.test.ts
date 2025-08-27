import { describe, expect, it } from "vitest";
import type { CommandSpec } from "./index.js";
import { AgentError, ProviderError } from "./index.js";

function summarize(spec: CommandSpec): string {
  if (spec.kind === "argv") {
    const args = spec.args?.join(" ") ?? "";
    return [spec.command, args].filter(Boolean).join(" ");
  }
  return spec.script.slice(0, 10);
}

describe("CommandSpec discriminated union", () => {
  it("handles argv and shell forms", () => {
    const a: CommandSpec = { kind: "argv", command: "echo", args: ["ok"] };
    const b: CommandSpec = { kind: "shell", script: "echo ok" };
    expect(summarize(a)).toContain("echo");
    expect(summarize(b)).toContain("echo");
  });
});

describe("Error classes", () => {
  it("carry codes and messages", () => {
    const e1 = new ProviderError("AUTHENTICATION_ERROR", "auth failed");
    const e2 = new AgentError("VALIDATION_ERROR", "bad input", {
      field: "prompt",
    });
    expect(e1.code).toBe("AUTHENTICATION_ERROR");
    expect(e2.code).toBe("VALIDATION_ERROR");
    expect(e2.details?.field).toBe("prompt");
  });
});
