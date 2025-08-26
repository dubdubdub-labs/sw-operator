import type {
  CommandSpec,
  CredentialFile,
  CredentialProfile,
  CredentialsInstaller,
  VMProvider,
} from "@repo/runtime-interfaces";

function normalizeContent(content: CredentialFile["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content).toString("base64");
  }
  return JSON.stringify(content);
}

export const DefaultCredentialsInstaller: CredentialsInstaller = {
  async install(
    provider: VMProvider,
    instanceId: string,
    profile: CredentialProfile
  ): Promise<void> {
    const writes = profile.files.map((file) => {
      const path = file.path;
      const mode = file.mode;
      const content = normalizeContent(file.content);
      return provider.files.writeFileAtomic(instanceId, path, content, {
        createDirs: true,
        mode,
      });
    });
    await Promise.all(writes);
    const post = profile.postInstall;
    if (post) {
      const commands: CommandSpec[] = Array.isArray(post) ? post : [post];
      const results = await Promise.all(
        commands.map((cmd) => provider.exec(instanceId, cmd))
      );
      for (const res of results) {
        if (res.exit_code !== 0) {
          throw new Error(
            `Post-install failed for ${profile.name} (exit ${res.exit_code})`
          );
        }
      }
    }
  },
};
