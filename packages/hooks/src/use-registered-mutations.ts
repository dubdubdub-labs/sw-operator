import type { RegisteredMutation } from "@repo/db-client";
import { db } from "@repo/db-client";

const flattenRegisteredMutations = (
  registeredMutations: typeof db.registeredMutations
) => {
  const result: Array<{
    path: string[];
    // biome-ignore lint/suspicious/noExplicitAny: helper type
    mutation: RegisteredMutation<any>;
    fullPath: string;
  }> = [];

  // biome-ignore lint/suspicious/noExplicitAny: helper func
  const traverse = (obj: any, path: string[] = []) => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];

      // Check if this is a mutation object (has args and handler properties)
      // or if it's a function (in case mutations are stored as functions)
      if (
        typeof value === "function" ||
        (value &&
          typeof value === "object" &&
          ("handler" in value || "args" in value))
      ) {
        result.push({
          path: currentPath,
          // biome-ignore lint/suspicious/noExplicitAny: helper type
          mutation: value as RegisteredMutation<any>,
          fullPath: currentPath.join("."),
        });
      } else if (value && typeof value === "object") {
        // It's a nested object, traverse deeper
        traverse(value, currentPath);
      }
    }
  };

  traverse(registeredMutations);
  return result;
};

export const useRegisteredMutations = () => {
  const registeredMutations = db.registeredMutations;
  const registeredMutationsFlatArr =
    flattenRegisteredMutations(registeredMutations);

  return {
    registeredMutations,
    registeredMutationsFlatArr,
  };
};
