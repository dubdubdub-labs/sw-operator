import type {
  CredentialProfile,
  CredentialsInstaller,
} from "@repo/runtime-interfaces";
export declare const DefaultCredentialsInstaller: CredentialsInstaller;
export declare function buildClaudeCredentialProfile(params: {
  authToken: string;
  expiresAt: string | number | Date;
}): CredentialProfile;
export default DefaultCredentialsInstaller;
//# sourceMappingURL=index.d.ts.map
