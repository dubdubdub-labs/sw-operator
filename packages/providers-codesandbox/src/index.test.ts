import { describe, expect, it } from "vitest";
import { createCodeSandboxProvider, mapBootupToStatus } from "./index.js";

describe("mapBootupToStatus", () => {
  it("maps FORK/RESUME/RUNNING to ready; CLEAN to booting", () => {
    expect(mapBootupToStatus("FORK")).toBe("ready");
    expect(mapBootupToStatus("RESUME")).toBe("ready");
    expect(mapBootupToStatus("RUNNING")).toBe("ready");
    expect(mapBootupToStatus("CLEAN")).toBe("booting");
  });
});

describe("createCodeSandboxProvider", () => {
  it("exposes default capabilities and a simple boot stub", async () => {
    const p = createCodeSandboxProvider({ apiKey: "x" });
    expect(p.capabilities?.homeDir).toBe("/project/workspace");
    const vm = await p.instances.boot("tpl-1");
    expect(vm.id).toContain("csb-tpl-1");
    expect(vm.status).toBe("ready");
  });
});
