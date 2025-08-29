export type CodeSandboxBootup = "FORK" | "RUNNING" | "RESUME" | "CLEAN";
export type ProviderStatus =
  | "booting"
  | "ready"
  | "stopping"
  | "stopped"
  | "error";
export declare function mapBootupToStatus(
  boot: CodeSandboxBootup
): ProviderStatus;
//# sourceMappingURL=status.d.ts.map
