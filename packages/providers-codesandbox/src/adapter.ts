export type ExecLikeResult = {
  stdout: string;
  stderr: string;
  exit_code: number;
};

export type CodeSandboxClient = {
  run: (command: string) => Promise<ExecLikeResult>;
  fs: {
    writeTextFile: (path: string, text: string) => Promise<void>;
    readTextFile: (path: string) => Promise<string>;
    fileExists?: (path: string) => Promise<boolean>;
    mkdirp?: (path: string) => Promise<void>;
  };
};

export type CodeSandboxAdapter = {
  connect: (instanceId: string) => Promise<CodeSandboxClient>;
};
