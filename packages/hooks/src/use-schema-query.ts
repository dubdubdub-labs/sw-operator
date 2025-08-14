import { dangerousUnsafeDb, db } from "@repo/db-core/client";

export const useSchemaQuery = () => {
  const { namespaces, attrs } = db.explorer.useSchemaQuery({
    db: dangerousUnsafeDb,
  });
  return { namespaces, attrs };
};
