import { createLogger } from "@repo/logger";
import { MorphClient, type MorphClientConfig } from "./client.js";
import { ImageService } from "./services/image.service.js";
import { InstanceService } from "./services/instance.service.js";
import { SnapshotService } from "./services/snapshot.service.js";
import { FileUtility } from "./utilities/file.utility.js";
import { PM2Utility } from "./utilities/pm2.utility.js";

export type { MorphClientConfig } from "./client.js";
export * from "./errors/index.js";
// Export all types
export * from "./types/index.js";
export { PM2ProcessBuilder } from "./utilities/pm2.utility.js";
export type {
  PM2Config,
  PM2ProcessInfo,
} from "./utilities/pm2.utility.js";

export interface MorphService {
  instances: InstanceService;
  snapshots: SnapshotService;
  images: ImageService;
  files: FileUtility;
  pm2: PM2Utility;
}

export const createMorphClient = (config: MorphClientConfig): MorphService => {
  const logger = config.logger ?? createLogger({ prefix: "MorphVM" });
  const client = new MorphClient(config);

  const instanceService = new InstanceService(
    client,
    logger.child({ prefix: "InstanceService" })
  );

  const snapshotService = new SnapshotService(
    client,
    logger.child({ prefix: "SnapshotService" })
  );

  const imageService = new ImageService(
    client,
    logger.child({ prefix: "ImageService" })
  );

  const fileUtility = new FileUtility(
    instanceService,
    logger.child({ prefix: "FileUtility" })
  );

  const pm2Utility = new PM2Utility(
    instanceService,
    logger.child({ prefix: "PM2Utility" })
  );

  return {
    instances: instanceService,
    snapshots: snapshotService,
    images: imageService,
    files: fileUtility,
    pm2: pm2Utility,
  };
};
