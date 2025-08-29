export declare function createSandboxFromTemplate(params: {
  apiKey: string;
  templateId: string;
  privacy?: "private" | "public" | "public-hosts";
}): Promise<{
  id: string;
  connect: () => Promise<unknown>;
}>;
export declare function resumeSandbox(params: {
  apiKey: string;
  id: string;
}): Promise<{
  id: string;
  connect: () => Promise<unknown>;
}>;
export declare function cleanupSandbox(params: {
  apiKey: string;
  id: string;
  preferShutdown?: boolean;
}): Promise<void>;
//# sourceMappingURL=util.d.ts.map
