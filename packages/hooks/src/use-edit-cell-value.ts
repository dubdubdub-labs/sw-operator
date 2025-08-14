import { db } from "@repo/db-core/client";

export const useEditCellValue = ({
  entityName,
  entityItemId,
  value,
  attrName,
}: {
  entityName: string;
  entityItemId: string;
  attrName: string;
  // biome-ignore lint/suspicious/noExplicitAny: helper type
  value: any;
}) => {
  const { mutate } = db.useRegisteredMutation(
    db.registeredMutations.explorer.editCellValue,
    {
      entityName,
      attrName,
      entityItemId,
      value,
    }
  );

  return { mutate };
};
