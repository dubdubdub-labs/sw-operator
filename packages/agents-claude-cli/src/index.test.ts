import { describe, expect, it } from "vitest";
import { type ClaudeAgentInput, createClaudeAgent } from "./index.js";

describe("createClaudeAgent", () => {
  it("builds a shell ProcessSpec with name, cwd, and model", () => {
    const agent = createClaudeAgent({
      defaultModel: "sonnet",
      workDir: "/project/workspace/operator/sw-compose",
    });
    const input: ClaudeAgentInput = {
      sessionName: "My Session!",
      prompt: "Say hi",
      systemPrompt: "sys",
    };
    const spec = agent.toProcessSpec(input);
    expect(spec.restart).toBe("never");
    expect(spec.command.kind).toBe("shell");
    if (spec.command.kind !== "shell") {
      return;
    }
    expect(spec.command.name).toBe("cc-My-Session-");
    expect(spec.command.cwd).toBe("/project/workspace/operator/sw-compose");
    expect(spec.command.script.includes("claude -p")).toBe(true);
    expect(spec.command.script.includes("--model sonnet")).toBe(true);
  });

  it("merges env and supports resume flag", () => {
    const agent = createClaudeAgent({});
    const spec = agent.toProcessSpec({
      prompt: "hi",
      resumeUuid: "abc",
      env: { A: "1" },
    });
    if (spec.command.kind !== "shell") {
      return;
    }
    expect(spec.command.env?.A).toBe("1");
    expect(spec.command.script.includes("-r abc")).toBe(true);
  });
});
