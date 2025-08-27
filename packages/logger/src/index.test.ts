import { describe, expect, it } from "vitest";
import { createLogger } from "./index.js";

describe("logger", () => {
  it("emits according to level filter", () => {
    const lines: Array<{
      level: string;
      msg: string;
      ctx?: Record<string, unknown>;
    }> = [];
    const logger = createLogger({
      name: "test",
      level: "info",
      sink: (level, message, context) =>
        lines.push({ level, msg: message, ctx: context }),
    });

    logger.debug("skip");
    logger.info("go");
    logger.error("fail", { code: 123 });

    expect(lines.length).toBe(2);
    const first = lines.at(0);
    const second = lines.at(1);
    if (!(first && second)) {
      return;
    }
    expect(first.level).toBe("info");
    expect(first.msg).toBe("go");
    expect(second.level).toBe("error");
    expect(second.ctx?.logger).toBe("test");
  });

  it("child logger inherits level and context and prefixes name", () => {
    const lines: Array<{ level: string; ctx?: Record<string, unknown> }> = [];
    const logger = createLogger({
      name: "root",
      level: "debug",
      sink: (level, _message, context) => lines.push({ level, ctx: context }),
      context: { a: 1 },
    });
    const childFactory = logger.child;
    expect(childFactory).toBeDefined();
    if (!childFactory) {
      return;
    }
    const child = childFactory({ name: "mod", context: { b: 2 } });
    child.debug("hello");
    expect(lines.length).toBe(1);
    const first = lines.at(0);
    if (!first) {
      return;
    }
    expect(first.ctx?.logger).toBe("root:mod");
    expect(first.ctx).toMatchObject({ a: 1, b: 2 });
  });
});
