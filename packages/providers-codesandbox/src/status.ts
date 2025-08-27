export type CodeSandboxBootup = "FORK" | "RUNNING" | "RESUME" | "CLEAN";

export type ProviderStatus =
  | "booting"
  | "ready"
  | "stopping"
  | "stopped"
  | "error";

export function mapBootupToStatus(boot: CodeSandboxBootup): ProviderStatus {
  switch (boot) {
    case "FORK":
    case "RESUME":
    case "RUNNING":
      return "ready";
    case "CLEAN":
      return "booting";
    default: {
      // Exhaustive guard
      const _x: never = boot;
      return _x;
    }
  }
}
