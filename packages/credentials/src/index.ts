import type {
  CredentialProfile,
  CredentialsInstaller,
  VMProvider,
} from "@repo/runtime-interfaces";
import { CredentialsError } from "@repo/runtime-interfaces";

export const DefaultCredentialsInstaller: CredentialsInstaller = async (
  provider: VMProvider,
  instanceId: string,
  profile: CredentialProfile
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

export function buildClaudeCredentialProfile(params: {
  authToken: string;
  expiresAt: string | number | Date;
}): CredentialProfile {
  let expiresAtStr: string;
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
  } satisfies CredentialProfile;
}

export default DefaultCredentialsInstaller;
