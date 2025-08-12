import { db } from "@repo/db-client";

export const useSchemaQuery = () => {
  const { namespaces, attrs } = db.explorer.useSchemaQuery();
  return { namespaces, attrs };
};
