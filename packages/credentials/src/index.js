import { CredentialsError } from "@repo/runtime-interfaces";
export const DefaultCredentialsInstaller = async (
  provider,
  instanceId,
  profile
) => {
  const writes = profile.files.map((file) =>
    (async () => {
      try {
        await provider.files.writeFileAtomic(
          instanceId,
          file.path,
          file.content,
          {
            encoding: file.encoding ?? "utf8",
            mode: file.mode ?? 0o600,
            createDirs: true,
          }
        );
      } catch (err) {
        throw new CredentialsError(
          "FILE_IO_ERROR",
          `Failed to write credential file: ${file.path}`,
          { path: file.path },
          { cause: err }
        );
      }
    })()
  );
  await Promise.all(writes);
  if (profile.postInstall) {
    const res = await provider.exec(instanceId, profile.postInstall);
    if (res.exit_code !== 0) {
      throw new CredentialsError(
        "PROCESS_ERROR",
        "Credential postInstall failed",
        {
          exit_code: res.exit_code,
        }
      );
    }
  }
};
export function buildClaudeCredentialProfile(params) {
  let expiresAtStr;
  if (params.expiresAt instanceof Date) {
    expiresAtStr = params.expiresAt.toISOString();
  } else if (typeof params.expiresAt === "string") {
    expiresAtStr = params.expiresAt;
  } else {
    expiresAtStr = new Date(params.expiresAt).toISOString();
  }
  const json = JSON.stringify(
    {
      claudeAiOauth: {
        accessToken: params.authToken,
        expiresAt: expiresAtStr,
        scopes: ["user:inference", "user:profile"],
        subscriptionType: "max",
      },
    },
    null,
    2
  );
  return {
    name: "claude-credentials",
    files: [
      {
        path: "~/.claude/.credentials.json",
        content: json,
        mode: 0o600,
        encoding: "utf8",
      },
    ],
  };
}
export default DefaultCredentialsInstaller;
