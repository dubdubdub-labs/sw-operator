import type { Logger } from "@repo/logger";
import type { MorphClient } from "../client.js";

export abstract class BaseService {
  protected readonly client: MorphClient;
  protected readonly logger: Logger;

  constructor(client: MorphClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }
}
