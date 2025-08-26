import { describe, expect, it } from "vitest";
import { createLogger } from "./index";

describe("logger", () => {
  it("filters by level and supports child loggers", () => {
    const entries: { level: string; name?: string; msg: string }[] = [];
    const log = createLogger({
      name: "Root",
      level: "info",
      sink: (e) => entries.push({ level: e.level, name: e.name, msg: e.msg }),
    });
    log.debug("skip");
    log.info("hello");
    const child = log.child({ name: "Child" });
    child.warn("warned");

    expect(entries.map((e) => e.msg)).toEqual(["hello", "warned"]);
    expect(entries.map((e) => e.name)).toEqual(["Root", "Child"]);
    expect(entries.map((e) => e.level)).toEqual(["info", "warn"]);
  });
});
