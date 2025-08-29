import type {
  CredentialsInstaller,
  Orchestrator as OrchestratorType,
  ProcessManager,
  VMProvider,
} from "@repo/runtime-interfaces";
export type OrchestratorDeps = {
  provider: VMProvider;
  processManager: ProcessManager;
  credentialsInstaller?: CredentialsInstaller;
};
export declare function createOrchestrator({
  provider,
  processManager,
  credentialsInstaller,
}: OrchestratorDeps): OrchestratorType;
export default createOrchestrator;
//# sourceMappingURL=index.d.ts.map
