import type { Logger } from "@repo/logger";
import type {
  Agent,
  AgentInput,
  CredentialProfile,
  Orchestrator,
  ProcessManager,
  VMProvider,
} from "@repo/runtime-interfaces";

export type CreateOrchestratorOptions = {
  provider: VMProvider;
  processManager: ProcessManager;
  agent: Agent;
  credentialsInstaller?: {
    install: (
      provider: VMProvider,
      instanceId: string,
      profile: CredentialProfile
    ) => Promise<void>;
  };
  logger?: Logger;
};

export function createOrchestrator(
  opts: CreateOrchestratorOptions
): Orchestrator {
  const { provider, processManager, agent, credentialsInstaller, logger } =
    opts;

  return {
    async bootAndPrepare(
      snapshotId,
      { ttl_seconds, ttl_action, credentialProfiles, machineInfo } = {}
    ) {
      logger?.info?.("boot_started", { snapshotId });
      const vm = await provider.instances.boot(snapshotId, {
        ttl_seconds,
        ttl_action,
      });
      logger?.info?.("boot_ready", { instanceId: vm.id });

      if (credentialProfiles?.length && credentialsInstaller) {
        await Promise.all(
          credentialProfiles.map((profile) =>
            credentialsInstaller.install(provider, vm.id, profile)
          )
        );
        logger?.info?.("creds_installed", { count: credentialProfiles.length });
      }

      if (machineInfo) {
        const info = { ...machineInfo, createdAt: new Date().toISOString() };
        const path = `${provider.capabilities?.homeDir ?? "~"}/.machine.json`;
        await provider.files.writeFileAtomic(
          vm.id,
          path,
          JSON.stringify(info, null, 2),
          { mode: "640" }
        );
      }

      return { instanceId: vm.id, capabilities: provider.capabilities };
    },
    async startSession(instanceId: string, input: AgentInput) {
      const spec = agent.toProcessSpec(input);
      const res = await processManager.start(instanceId, spec);
      logger?.info?.("session_started", { instanceId, name: res.name });
      return { processName: res.name };
    },
    logs(instanceId: string, name?: string, lines?: number) {
      return processManager.logs(instanceId, name, lines);
    },
    listProcesses(instanceId: string) {
      return processManager.list(instanceId);
    },
  };
}
