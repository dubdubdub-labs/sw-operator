export const getInstantAppId = () => {
  if (process.env.NEXT_PUBLIC_INSTANT_APP_ID) {
    return process.env.NEXT_PUBLIC_INSTANT_APP_ID;
  }
  throw new Error("NEXT_PUBLIC_INSTANT_APP_ID is not set");
};
