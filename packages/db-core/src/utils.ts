export const getEnvVar = (name: string) => {
  if (process.env[name]) {
    return process.env[name];
  }
  throw new Error(`${name} is not set`);
};
