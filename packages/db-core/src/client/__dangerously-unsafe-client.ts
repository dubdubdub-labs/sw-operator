import { init } from "@instantdb/react";

/**
 * This is a dangerous untyped client that has ~root access to the database
 *
 * It is only used for the db explorer and should not be used for any other purpose
 */
export const dangerousUnsafeDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID ?? "",
  // @ts-expect-error - __adminToken is not an official option; we're using it as a hack for our db explorer
  __adminToken: process.env.NEXT_PUBLIC_INSTANT_APP_ADMIN_TOKEN,
  devtool: false,
  useDateObjects: false,
});
