import { CodeSandbox } from "@codesandbox/sdk";

export async function createSandboxFromTemplate(params: {
  apiKey: string;
  templateId: string;
  privacy?: "private" | "public" | "public-hosts";
}): Promise<{ id: string; connect: () => Promise<unknown> }> {
  const sdkUnknown = new CodeSandbox(params.apiKey) as unknown;
  const sandboxes = (sdkUnknown as { sandboxes: unknown }).sandboxes as {
    create: (opts: Record<string, unknown>) => Promise<unknown>;
  };
  const sandbox = await sandboxes.create({
    source: "template",
    id: params.templateId,
    privacy: params.privacy ?? "private",
  } as Record<string, unknown>);
  return sandbox as { id: string; connect: () => Promise<unknown> };
}

export async function resumeSandbox(params: {
  apiKey: string;
  id: string;
}): Promise<{ id: string; connect: () => Promise<unknown> }> {
  const sdkUnknown = new CodeSandbox(params.apiKey) as unknown;
  const sandboxes = (sdkUnknown as { sandboxes: unknown }).sandboxes as {
    resume: (id: string) => Promise<unknown>;
  };
  const sb = await sandboxes.resume(params.id);
  return sb as { id: string; connect: () => Promise<unknown> };
}

export async function cleanupSandbox(params: {
  apiKey: string;
  id: string;
  preferShutdown?: boolean;
}): Promise<void> {
  const sdkUnknown = new CodeSandbox(params.apiKey) as unknown;
  const sandboxes = (sdkUnknown as { sandboxes: unknown }).sandboxes as {
    hibernate: (id: string) => Promise<void>;
    shutdown?: (id: string) => Promise<void>;
  };
  try {
    if (params.preferShutdown && sandboxes.shutdown) {
      await sandboxes.shutdown(params.id);
      return;
    }
    await sandboxes.hibernate(params.id);
  } catch {
    // ignore cleanup errors
  }
}
