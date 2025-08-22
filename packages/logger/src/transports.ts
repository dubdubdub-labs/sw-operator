import type { LogTransport } from "./types.js";

export const consoleTransport: LogTransport = (
  formattedMessage: string
): void => {
  console.log(formattedMessage);
};
