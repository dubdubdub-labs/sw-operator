import type { RegisteredQuery } from "@repo/db-client";
import { db } from "@repo/db-client";

const flattenRegisteredQueries = (
  registeredQueries: typeof db.registeredQueries
) => {
  const result: Array<{
    path: string[];
    // biome-ignore lint/suspicious/noExplicitAny: helper type
    query: RegisteredQuery<any, any>;
    fullPath: string;
  }> = [];

  // biome-ignore lint/suspicious/noExplicitAny: helper func
  const traverse = (obj: any, path: string[] = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      // Check if this is a query object (has args and handler properties)
      // or if it's a function (in case queries are stored as functions)
      if (
        typeof value === "function" ||
        (value &&
          typeof value === "object" &&
          ("handler" in value || "args" in value))
      ) {
        result.push({
          path: currentPath,
          // biome-ignore lint/suspicious/noExplicitAny: helper type
          query: value as RegisteredQuery<any, any>,
          fullPath: currentPath.join("."),
        });
      } else if (value && typeof value === "object") {
        // It's a nested object, traverse deeper
        traverse(value, currentPath);
      }
    }
  };

  traverse(registeredQueries);
  return result;
};

export const useRegisteredQueries = () => {
  const registeredQueries = db.registeredQueries;
  const registeredQueriesFlatArr = flattenRegisteredQueries(registeredQueries);

  return {
    registeredQueries,
    registeredQueriesFlatArr,
  };
};
