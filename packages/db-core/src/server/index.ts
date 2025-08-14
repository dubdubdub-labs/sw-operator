import { init } from "@instantdb/admin";
import schema from "../instant.schema";
import { getEnvVar } from "../utils";

const appId = getEnvVar("INSTANT_APP_ID");
const adminToken = getEnvVar("INSTANT_ADMIN_TOKEN");

export const adminDb = init({
  appId,
  adminToken,
  schema,
});
