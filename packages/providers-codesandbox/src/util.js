import { CodeSandbox } from "@codesandbox/sdk";
export async function createSandboxFromTemplate(params) {
  const sdkUnknown = new CodeSandbox(params.apiKey);
  const sandboxes = sdkUnknown.sandboxes;
  const sandbox = await sandboxes.create({
    source: "template",
    id: params.templateId,
    privacy: params.privacy ?? "private",
  });
  return sandbox;
}
export async function resumeSandbox(params) {
  const sdkUnknown = new CodeSandbox(params.apiKey);
  const sandboxes = sdkUnknown.sandboxes;
  const sb = await sandboxes.resume(params.id);
  return sb;
}
export async function cleanupSandbox(params) {
  const sdkUnknown = new CodeSandbox(params.apiKey);
  const sandboxes = sdkUnknown.sandboxes;
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
