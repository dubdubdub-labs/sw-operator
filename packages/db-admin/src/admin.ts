import { init } from "@instantdb/admin";
import schema from "@repo/db-core/schema";

const getInstantAppId = () => {
  if (process.env.NEXT_PUBLIC_INSTANT_APP_ID) {
    return process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  }
  throw new Error("NEXT_PUBLIC_INSTANT_APP_ID is not set");
};

const getInstantAppAdminToken = () => {
  if (process.env.INSTANT_APP_ADMIN_TOKEN) {
    return process.env.INSTANT_APP_ADMIN_TOKEN;
  }
  throw new Error("INSTANT_APP_ADMIN_TOKEN is not set");
};

const appId = getInstantAppId();
const adminToken = getInstantAppAdminToken();

export const adminDb = init({
  appId,
  schema,
  adminToken,
});
