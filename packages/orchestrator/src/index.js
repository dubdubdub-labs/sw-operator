export function createOrchestrator({
  provider,
  processManager,
  credentialsInstaller,
}) {
  return {
    async bootAndPrepare(snapshotId, opts) {
      const vm = await provider.instances.boot(snapshotId, opts);
      const instanceId = vm.id;
      if (opts?.credentialProfiles && credentialsInstaller) {
        const installs = opts.credentialProfiles.map((profile) =>
          credentialsInstaller(provider, instanceId, profile)
        );
        await Promise.all(installs);
      }
      if (opts?.machineInfo) {
        const info = {
          ...opts.machineInfo,
          createdAt: new Date().toISOString(),
        };
        const content = JSON.stringify(info, null, 2);
        const home = provider.capabilities?.homeDir ?? "/project/workspace";
        const path = `${home}/.machine.json`;
        await provider.files.writeFileAtomic(instanceId, path, content, {
          encoding: "utf8",
          mode: 0o640,
          createDirs: true,
        });
      }
      const caps = provider.capabilities;
      return { instanceId, capabilities: caps };
    },
    async startSession(instanceId, agent, input, pm) {
      const spec = agent.toProcessSpec(input);
      const usedPm = pm ?? processManager;
      const res = await usedPm.start(instanceId, spec);
      return { processName: res.name };
    },
    logs(instanceId, pm, params) {
      const usedPm = pm ?? processManager;
      return usedPm.logs(instanceId, params);
    },
    listProcesses(instanceId, pm) {
      const usedPm = pm ?? processManager;
      return usedPm.list(instanceId);
    },
  };
}
export default createOrchestrator;
